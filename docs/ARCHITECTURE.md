# ATLANTIS Agent System — Architecture

Target: Sui Overflow 2026 Walrus track. Build window May 7 – June 21, 2026.

## 1. The thesis in one paragraph

ATLANTIS becomes the agentic discovery layer for Sui. Four specialist evaluator agents (security, tokenomics, UX, metrics) analyze each registered dApp and write findings to Walrus. A summarizer fuses them into a per-dApp report and registers the blob ID on-chain in a new `agent_reports` Move module, making the report *verifiable* (a known agent identity wrote it at a known time). A personal agent uses MemWal to store a per-user profile built from wallet history + interactions, reads the shared summary reports, and produces curated recommendations and risk warnings. Cross-agent memory sharing happens through MemWal scratchpads and on-chain report references.

## 2. End-to-end data flow

```
dApp registered on-chain
        │
        ▼
[Orchestrator]  ─── queues evaluator job
        │
        ├──► Security agent  ──┐
        ├──► Tokenomics agent ─┤  each writes:
        ├──► UX agent         ─┤   • observations to MemWal (shared scratchpad)
        └──► Metrics agent    ─┘   • structured finding to Walrus
                                   │
                                   ▼
                          [Summarizer agent]
                                   │
                          consensus report → Walrus blob
                                   │
                          AgentReport object on-chain
                                   │
                                   ▼
User connects wallet ──► [Personal agent]
                          │
                          ├─ reads user profile from MemWal
                          ├─ reads recent AgentReports
                          └─ produces ranked feed + warnings
                                   │
                                   ▼
                          UI: personalized home + chat
```

## 3. Move module — `agent_reports`

New module in `mamiwaterc/sources/agent_reports.move`. Kept separate from `dapp_registry` for clean upgrade story.

```move
module mamiwaterc::agent_reports {
    use std::string::String;
    use sui::table::{Self, Table};
    use sui::clock::Clock;
    use sui::event;

    // ====== Capability ======
    public struct AgentCap has key, store { id: UID }

    // ====== Objects ======
    public struct ReportRegistry has key {
        id: UID,
        latest_summary: Table<ID, ID>,      // dapp_id -> latest summary AgentReport id
        all_reports: Table<ID, vector<ID>>, // dapp_id -> all AgentReport ids
        admin: address,
    }

    public struct AgentReport has key, store {
        id: UID,
        dapp_id: ID,
        agent_kind: String,         // "security" | "tokenomics" | "ux" | "metrics" | "summary"
        agent_version: String,      // e.g. "claude-sonnet-4-6@prompt-v1"
        report_blob_id: String,     // Walrus blob — full structured JSON
        memwal_thread: Option<String>, // pointer to MemWal scratchpad for this round
        verdict: u8,                // 0=red, 1=yellow, 2=green
        score: u8,                  // 0..100
        round_id: u64,              // groups specialist reports + their summary
        created_at: u64,
    }

    // ====== Events ======
    public struct ReportPublished has copy, drop {
        report_id: ID,
        dapp_id: ID,
        agent_kind: String,
        verdict: u8,
        score: u8,
        round_id: u64,
        timestamp: u64,
    }

    fun init(ctx: &mut TxContext) {
        transfer::share_object(ReportRegistry {
            id: object::new(ctx),
            latest_summary: table::new(ctx),
            all_reports: table::new(ctx),
            admin: tx_context::sender(ctx),
        });
        transfer::transfer(AgentCap { id: object::new(ctx) }, tx_context::sender(ctx));
    }

    public entry fun publish_report(
        _cap: &AgentCap,
        registry: &mut ReportRegistry,
        dapp_id: ID,
        agent_kind: String,
        agent_version: String,
        report_blob_id: String,
        memwal_thread: Option<String>,
        verdict: u8,
        score: u8,
        round_id: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) { /* create AgentReport, index it, emit event, if kind=="summary" update latest_summary */ }
}
```

**Why AgentCap, not per-agent keypair**: keeps the hackathon simple. One backend signer holds the AgentCap and signs all reports. The agent_kind + agent_version fields identify which logical agent produced it. Post-hackathon we can split into per-agent caps.

**Why blob_id + on-chain pointer**: the heavy structured JSON (findings, evidence, model output) lives on Walrus; on-chain stores only verifiable references + the quick-filter verdict/score. Same pattern as existing reviews/comments.

## 4. Backend agent runtime

New layer in `backend/src/agents/`:

```
agents/
├── runtime/
│   ├── claude.ts         # tool-use loop wrapping Anthropic SDK
│   ├── memwal.ts         # MemWal client (delegate key)
│   ├── walrus.ts         # thin wrapper over existing publishers/aggregators
│   └── sui.ts            # signed publish_report calls + read helpers
├── tools/
│   ├── sui_query.ts
│   ├── blockberry.ts
│   ├── walrus_io.ts
│   ├── memwal_io.ts
│   └── http_fetch.ts
├── specialists/
│   ├── security.ts
│   ├── tokenomics.ts
│   ├── ux.ts
│   └── metrics.ts
├── summarizer.ts
├── personal.ts
└── orchestrator.ts
```

**Model choice**:
- Specialists: `claude-sonnet-4-6` (cheaper, fast, fine for structured analysis with tools)
- Summarizer + personal agent: `claude-opus-4-7` (synthesis quality matters, fewer calls)
- Both use prompt caching (Anthropic SDK) — system prompt + tool definitions + dApp metadata are cacheable across runs

**Tool-use loop**: standard Anthropic tool-use pattern. Each specialist gets ~6-10 tools, runs until it emits a `submit_finding` tool call with structured output. Cap turns at 12; abort with `verdict=yellow, confidence=low` if exceeded.

**Where it runs**: Vercel serverless will not work for multi-turn agent loops (10–60s timeouts vs. agent runs of 1–3 min). Move the agent service to **Railway or Fly.io** — long-running Node container, same Express codebase. Keep existing Vercel endpoints (sponsor-tx, verify-user) where they are.

## 5. Specialist agent contracts

Every specialist takes the same input and produces the same output schema. This is what enables the summarizer to fuse them mechanically.

**Input**:
```ts
{
  dappId: string,           // on-chain DApp object id
  packageId?: string,       // dApp's Move package id (for security agent)
  metadata: {               // pulled from dapp_registry by orchestrator
    name, tagline, category, website, twitter, github
  },
  roundId: number,          // unix ms when this evaluation round started
  threadKey: string,        // MemWal key for the shared scratchpad this round
}
```

**Output** (written to Walrus, also passed to summarizer):
```ts
{
  agent: "security" | "tokenomics" | "ux" | "metrics",
  version: string,
  dappId: string,
  roundId: number,
  verdict: "green" | "yellow" | "red",
  score: number,            // 0..100
  confidence: number,       // 0..1
  findings: [{
    severity: "info" | "low" | "med" | "high" | "critical",
    title: string,
    detail: string,
    evidence: { txDigest?, blobId?, url?, packageId?, line? }
  }],
  recommendations: string[],
  generatedAt: number,
  modelTrace: { tokensIn, tokensOut, turns }
}
```

**What each specialist actually does**:

| Agent | Reads | Looks for | Stuck/unknown verdict |
| --- | --- | --- | --- |
| Security | Move source via Sui RPC `getNormalizedMoveModulesByPackage`, recent txs, admin caps, upgrade policy | admin functions w/o caps, mints without limits, upgradeable w/o multisig, suspicious authority transfers | yellow w/ low confidence |
| Tokenomics | Coin metadata, treasury balance, supply, recent transfers from creator | concentration, recent dumps, hidden mint authority | green w/ note "no token detected" |
| UX | Live website (HTTP fetch), README from GitHub, existing on-chain reviews via Walrus | accessibility, clarity, dead links, presence of docs | yellow if site unreachable |
| Metrics | Blockberry + on-chain interaction counts from `dapp_registry` | activity trend, retention, anomalies | green at score=50 if no signal |

## 6. Summarizer

Reads the four specialist outputs + the shared MemWal scratchpad. Produces:
- Composite verdict using a simple rule (any `red` → red; any two `yellow` → yellow; else green) *plus* LLM nuance
- Composite score = weighted mean (security 35%, tokenomics 25%, UX 20%, metrics 20%)
- One-paragraph human summary
- Top 3 highlights and top 3 risks
- Same output schema as specialists with `agent: "summary"`

Writes to Walrus, then calls `publish_report` on-chain with `agent_kind: "summary"` so it lands in `latest_summary`.

## 7. Personal agent + MemWal schema

**Storage split**:
- **MemWal**: user profile + interaction memory (mutable, retrievable, embedding-friendly)
- **Walrus direct**: finished artifacts (specialist + summary reports, generated explanations)
- **On-chain**: AgentReport pointers, dApp registry, reviews

**MemWal collections**:

```
atlantis/user/{address}/profile-v1        — slow-changing prefs + persona
atlantis/user/{address}/wallet-summary    — derived from Blockberry/on-chain; refreshed on connect
atlantis/user/{address}/history           — append-only: viewed, reviewed, recommended-accepted, recommended-rejected
atlantis/user/{address}/conversations     — chat threads with the personal agent
atlantis/evaluator/{roundId}/scratch      — shared specialist scratchpad (ephemeral, ~14 day TTL)
```

**User profile shape**:
```ts
{
  address: string,
  persona: "Voyager" | "Liquidity Lord" | "Collector" | "Degen" | "Whale" | "New Fish",
  preferences: {
    categories: Category[],
    riskTolerance: "low" | "med" | "high",
    avoidPackageIds: string[],
  },
  walletSummary: { totalTxs, gasBurned, daysActive, topDApps: string[], ... },
  lastUpdated: number,
}
```

**Personal agent loop**:
1. On wallet connect → trigger background refresh of `wallet-summary` (uses existing `useSuiWrappedStats` pipeline)
2. On page load → load profile from MemWal, fetch latest summary reports filtered by `preferences.categories`
3. Rank: LLM call (Opus) takes profile + 10-30 candidate summaries → outputs ranked list with one-line "why this" per item
4. On user action ("show me low-risk DEXes", accept/reject a rec) → append to `history` collection in MemWal

**Conversational mode** uses tool calls:
- `list_dapps(category?, min_score?, max_risk?)`
- `get_summary_report(dappId)`
- `get_specialist_report(dappId, agent)`
- `read_my_profile()` (gated to caller's address via wallet sig)
- `update_my_preferences(patch)`

## 8. Frontend changes

**New**:
- `src/components/AgentReportPanel.tsx` — on dApp detail page, renders summary verdict + expandable specialist findings, with "view evidence" links to Walrus blobs and tx digests
- `src/pages/MemoryInspector.tsx` — shows current user's MemWal collections, lets them delete entries (required for the track's "interfaces to inspect/debug agent memory" bullet)
- `src/components/PersonalFeed.tsx` — replaces or sits next to `TrendingDashboard` on home; shows ranked recommendations w/ "Why this?"
- `src/components/AgentChat.tsx` — sidebar chat with personal agent (streaming responses)

**Keep, lightly touched**:
- `useDApps`, `useReviews`, `useComments` — unchanged
- Wallet/Enoki plumbing — unchanged
- Submit/profile pages — unchanged

**Freeze (don't add features, just keep working)**:
- AirdropsPage, UpdatesPage, DiscussionsPage, NewsCard — out of scope for v1

## 9. Cost and rate-limit budget

Per-dApp evaluation:
- 4 specialists × ~8K in / 2K out tokens (Sonnet 4.6) ≈ ~$0.10
- Summarizer × ~6K in / 1K out (Opus 4.7) ≈ ~$0.15
- **~$0.25 per full evaluation round**

Volume:
- Registry has ~tens of registered dApps. Run one initial sweep + on each new registration + 24h freshness sweep on top 20 most-viewed
- ~50 dApps × $0.25 + ongoing ≈ **<$50 total LLM cost** for the hackathon

Personal agent:
- Ranking call ≈ $0.02/user/day at Opus
- Chat ≈ depends on engagement; cap at 50 turns/user/day during demo period

**Hard limits to wire in week 1**:
- Per-agent turn cap (12)
- Per-evaluation total token cap (40K)
- Per-user daily personal-agent cap (50 turns)

## 10. Module ownership and verifiable identity

For the hackathon, "verifiable" comes from:
1. A single backend signer holds `AgentCap`
2. Every report on-chain carries `agent_kind` + `agent_version`
3. Walrus blob contains full `modelTrace` (model id, prompt hash, tokens used, turns)
4. Anyone can re-derive the same finding by re-running the same `agent_kind@version` against the same `dappId` (deterministic enough with `temperature=0`)

Post-hackathon, this can move to per-agent zkLogin identities and on-chain agent capabilities, but that's not in scope here.

## 11. Open questions (decide before Week 1, May 12–18)

| Question | Default if no decision | Cost of changing later |
| --- | --- | --- |
| LLM provider | Anthropic (Claude Sonnet 4.6 + Opus 4.7) | low — runtime is provider-agnostic by week 2 |
| Where to host agent service | Railway free tier | low — Docker image, portable |
| MemWal account owner | Single project account, single delegate key | medium — schema scoped per-user already |
| Mainnet or testnet | Testnet | high — touches contract deploys + frontend constants |
| Read access for AgentReport blobs | Public (no Seal) | medium — Seal can be layered on later |
| Demo dApp set | All ~tens of registry entries | trivial |

## 12. Week 1 exit criteria

By end of May 18, working end-to-end on one dApp:
- [ ] `agent_reports` module deployed to testnet, `AgentCap` in backend signer's wallet
- [ ] MemWal account + delegate key in backend env
- [ ] Anthropic API key wired into `runtime/claude.ts` with tool-use loop, prompt caching on
- [ ] Security specialist runs against one real registry dApp, writes blob, publishes on-chain report
- [ ] `AgentReportPanel` on dApp detail page renders that one report
- [ ] All three caps (turn, token, user) enforced

No specialists 2–4, no summarizer, no personal agent, no UI polish in week 1. Those are weeks 2–3.
