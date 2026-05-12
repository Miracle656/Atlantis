# ATLANTIS — Contributor Issues for Sui Overflow 2026

Each section below is a self-contained issue. Copy the section into GitHub's "New Issue" form (title + body). They're ordered roughly by week and by what unblocks what — see the dependency line in each issue.

**Suggested GitHub labels to create first**: `move`, `backend`, `frontend`, `infra`, `agent`, `tx-layer`, `week-1`, `week-2`, `week-3`, `week-4`, `good-first-issue`, `blocked`, `critical-path`.

Architecture reference: [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md). Branding reference for the deck: [`docs/pitch-deck.html`](../pitch-deck.html).

---

## #1 · Deploy `agent_reports` Move module to testnet

**Labels:** `move`, `infra`, `week-1`, `critical-path`
**Depends on:** none — this is the unblocker for almost everything else
**Owner suggestion:** whoever has the deployer wallet + Sui CLI configured

### Scope
Deploy `agent_reports/` to Sui testnet and record the published object IDs in `mamiwaterf/src/constants.ts` so the rest of the stack can target them.

### Steps
1. `cd agent_reports && sui move build` — confirm clean build
2. `cd agent_reports && sui client publish --gas-budget 200000000` from a testnet-funded wallet
3. Capture from the publish output:
   - `AGENT_REPORTS_PACKAGE_ID` (new package)
   - `AGENT_REPORTS_REGISTRY_ID` (shared `ReportRegistry` object)
   - `AGENT_CAP_ID` (the `AgentCap` transferred to the deployer)
4. Add the three IDs to `mamiwaterf/src/constants.ts` and to `backend/.env.example`
5. Comment the deploy tx digest in this issue for the audit trail

### Acceptance
- [ ] Module deployed, three IDs committed
- [ ] `backend/.env.example` updated
- [ ] Deploy digest pasted in issue

---

## #2 · Push monorepo to GitHub and archive old repos

**Labels:** `infra`, `week-1`, `critical-path`
**Depends on:** none

### Scope
The monorepo at `C:/Users/HP/Documents/sui/atlantis/` is local-only. Push it and archive the three predecessor repos so we have one canonical URL for the hackathon submission.

### Steps
1. Create empty repo at `github.com/Miracle656/atlantis` (no README, no .gitignore — we have them)
2. `git remote add origin https://github.com/Miracle656/atlantis.git && git push -u origin main`
3. On each of `atlantis_backend`, `atlantis_contract`, `mamiwater`: update README to point at the new repo, then GitHub → Settings → Archive
4. Update `mamiwaterf/README.md` clone URL to the new repo

### Acceptance
- [ ] `https://github.com/Miracle656/atlantis` exists with all history (39+ commits)
- [ ] Three old repos archived with pointer READMEs
- [ ] Frontend README updated

---

## #3 · Backend agent runtime — Claude tool-use loop

**Labels:** `backend`, `agent`, `week-1`, `critical-path`
**Depends on:** #1 (needs the AgentCap ID at runtime)
**Owner suggestion:** strongest TypeScript dev

### Scope
Scaffold `backend/src/agents/runtime/claude.ts` — a reusable Claude tool-use loop that takes a system prompt + tool definitions + initial user message, runs the agent to completion (or max turns), and returns the final structured output.

### Requirements
- Anthropic SDK v0.x latest; both Sonnet 4.6 (`claude-sonnet-4-6`) and Opus 4.7 (`claude-opus-4-7`)
- Prompt caching ON for system prompt + tool definitions
- Hard caps: 12 turns / 40K total tokens — abort with structured error if exceeded
- All tool calls go through a single `executeTool(name, input)` dispatcher
- `temperature: 0` for reproducibility
- Returns `{ output, modelTrace: { tokensIn, tokensOut, turns, model } }`

### Files
- NEW `backend/src/agents/runtime/claude.ts`
- NEW `backend/src/agents/runtime/types.ts` — shared types (Tool, AgentRun, ModelTrace)
- Update `backend/package.json` to add `@anthropic-ai/sdk`
- Update `backend/.env.example` with `ANTHROPIC_API_KEY`

### Acceptance
- [ ] Unit-tested with a dummy "echo" tool: agent calls the tool with given args, gets response, returns final assistant message
- [ ] Caps enforced (write a test that triggers turn cap)
- [ ] Prompt caching headers verified via SDK response

---

## #4 · MemWal client wrapper

**Labels:** `backend`, `agent`, `week-1`
**Depends on:** none, but #3 needs to consume this
**Owner suggestion:** whoever signs up for the MemWal account

### Scope
Wrap MemWal's API in a typed Node client at `backend/src/agents/runtime/memwal.ts` with five methods covering the access patterns the architecture doc defines.

### Required methods
```ts
class MemWalClient {
  read(key: string): Promise<MemoryEntry | null>;
  write(key: string, value: object, options?: { ttlMs?: number }): Promise<void>;
  appendToThread(threadKey: string, entry: ThreadEntry): Promise<void>;
  search(prefix: string, query: string, k?: number): Promise<MemoryEntry[]>;
  delete(key: string): Promise<void>;
}
```

### Key namespaces (from architecture)
- `atlantis/user/{address}/profile-v1`
- `atlantis/user/{address}/wallet-summary`
- `atlantis/user/{address}/history`
- `atlantis/user/{address}/conversations`
- `atlantis/evaluator/{roundId}/scratch` (TTL ~14 days)

### Files
- NEW `backend/src/agents/runtime/memwal.ts`
- Update `backend/.env.example` with `MEMWAL_ACCOUNT_ID` + `MEMWAL_DELEGATE_KEY`
- Reference impl: clone of `MystenLabs/MemWal` is at `C:/Users/HP/Documents/sui/MemWal/`

### Acceptance
- [ ] Integration test writes + reads + deletes a test key with a real delegate key
- [ ] Throws typed errors on auth failure vs not-found vs rate-limit

---

## #5 · Walrus client wrapper for agents

**Labels:** `backend`, `agent`, `week-1`
**Depends on:** none

### Scope
Port the existing frontend Walrus client (`mamiwaterf/src/walrus.ts`) to backend with the same multi-publisher fallback. Add a `writeJson` helper that stringifies and uploads structured agent output.

### Files
- NEW `backend/src/agents/runtime/walrus.ts`
- Use the same publisher + aggregator lists as `mamiwaterf/src/constants.ts`

### Acceptance
- [ ] `writeJson({...})` returns a blob id usable on testnet
- [ ] `fetchJson(blobId)` returns parsed JSON
- [ ] Falls back through all 8 publishers on upload failure

---

## #6 · Sui publish-report helper

**Labels:** `backend`, `agent`, `week-1`
**Depends on:** #1

### Scope
A typed wrapper `backend/src/agents/runtime/sui.ts` exposing `publishReport(args)` that signs and submits the `agent_reports::publish_report` Move call with the AgentCap.

### Method
```ts
publishReport(args: {
  dappId: string,
  agentKind: 'security'|'tokenomics'|'ux'|'metrics'|'summary',
  agentVersion: string,
  reportBlobId: string,
  memwalThread?: string,
  verdict: 0|1|2,
  score: number,    // 0..100
  roundId: number,
}): Promise<{ digest: string, reportId: string }>
```

### Files
- NEW `backend/src/agents/runtime/sui.ts`
- Reuse the existing Ed25519 keypair pattern from `backend/src/services/verification.ts`

### Acceptance
- [ ] Round-trip test: call publishReport, fetch the resulting AgentReport object, fields match

---

## #7 · Specialist agent — Security

**Labels:** `backend`, `agent`, `week-1`, `critical-path`
**Depends on:** #3, #4, #5, #6
**Owner suggestion:** Move-savvy dev

### Scope
The first specialist agent, end-to-end. Reads a dApp's Move package via Sui RPC, looks for common red flags, writes a structured finding to Walrus, publishes on-chain.

### Red flags to check (initial list — extend later)
- Admin functions without capability gates
- Mintable currencies without supply caps
- Upgradeable package without timelock or multisig
- Authority transfer functions reachable by any caller

### I/O contract
See `docs/ARCHITECTURE.md` §5 — the same input/output schema all specialists conform to.

### Files
- NEW `backend/src/agents/specialists/security.ts`
- NEW `backend/src/agents/tools/sui_query.ts` (read-only Sui helpers)

### Acceptance
- [ ] Runs against a known testnet dApp in under 90 seconds
- [ ] Publishes an AgentReport on-chain that's fetchable via `sui_getObject`
- [ ] Writes findings JSON to Walrus, blob id matches on-chain pointer
- [ ] Output schema validates against `runtime/types.ts`

---

## #8 · AgentReportPanel UI component

**Labels:** `frontend`, `week-1`
**Depends on:** #7 (need at least one real report to display)

### Scope
React component on the dApp detail page that fetches the latest summary AgentReport for a dApp and renders the verdict + score + specialist breakdown. Expandable per-specialist view that lazy-loads the full Walrus blob.

### Files
- NEW `mamiwaterf/src/components/AgentReportPanel.tsx`
- NEW `mamiwaterf/src/hooks/useAgentReport.ts` — React Query hook over `latest_summary` + `reports_for` view fns
- Plug into `mamiwaterf/src/pages/DAppDetailPage.tsx`

### Acceptance
- [ ] Renders verdict badge (red/yellow/green) and score 0–100
- [ ] Lists each specialist's verdict in a row, click to expand
- [ ] "View on Sui Explorer" link to the AgentReport object
- [ ] "View on Walrus" link to the blob
- [ ] Loading + error states match neo-brutalist styling

---

## #9 · Specialist agent — Tokenomics

**Labels:** `backend`, `agent`, `week-2`
**Depends on:** #3–6

### Scope
Same I/O contract as #7. Reads coin metadata, supply, treasury, and recent large transfers. Returns `green` with note when the dApp has no associated token.

### Things to check
- Total supply vs. circulating supply
- Top-N holder concentration
- Recent transfers from deployer / treasury (rug signal)
- Mint authority status

### Files
- NEW `backend/src/agents/specialists/tokenomics.ts`
- NEW `backend/src/agents/tools/coin_metadata.ts`

### Acceptance
- [ ] Runs against a dApp with a coin and one without
- [ ] Publishes on-chain report

---

## #10 · Specialist agent — UX

**Labels:** `backend`, `agent`, `week-2`
**Depends on:** #3–6

### Scope
HTTP-fetches the dApp's website + README, evaluates clarity, accessibility hints, presence of docs. The most LLM-intensive specialist.

### Tools
- `http_fetch(url)` — with size cap (200KB) and timeout
- Reuse existing on-chain reviews via `walrus_fetch` for sentiment input

### Files
- NEW `backend/src/agents/specialists/ux.ts`
- NEW `backend/src/agents/tools/http_fetch.ts`

### Acceptance
- [ ] Yellow with low confidence when site unreachable (no failure)
- [ ] Cites specific URL fragments in findings

---

## #11 · Specialist agent — Metrics

**Labels:** `backend`, `agent`, `week-2`
**Depends on:** #3–6

### Scope
Pulls TVL, volume, users, and on-chain interaction counts from existing Blockberry helpers + the `dapp_registry` `user_interactions` table. Flags anomalies (sudden volume spike, retention cliff).

### Files
- NEW `backend/src/agents/specialists/metrics.ts`
- NEW `backend/src/agents/tools/blockberry.ts` — wrap existing `mamiwaterf/src/utils/blockberry.ts` for backend use (extract to shared file if needed)

### Acceptance
- [ ] Score scales smoothly with activity, doesn't hard-fail when Blockberry has no data

---

## #12 · Summarizer agent

**Labels:** `backend`, `agent`, `week-2`, `critical-path`
**Depends on:** #7, #9, #10, #11

### Scope
Reads the four specialist outputs + the round's MemWal scratchpad, produces the consensus report. Composite verdict via rule (any red→red; any two yellow→yellow; else green) plus LLM nuance. Composite score = weighted mean (security 35%, tokenomics 25%, UX 20%, metrics 20%).

### Files
- NEW `backend/src/agents/summarizer.ts`

### Acceptance
- [ ] Output `agent_kind: "summary"` is what `AgentReportPanel` picks up as the headline
- [ ] When all 4 specialists report green, summarizer can't downgrade below yellow without a justification field

---

## #13 · Orchestrator + job queue

**Labels:** `backend`, `agent`, `week-2`
**Depends on:** #7 (need one specialist running to test the orchestrator)

### Scope
Job runner that triggers full evaluation rounds. Triggers:
- On `DAppRegistered` event from existing `dapp_registry` module (subscribe via Sui event poll)
- On manual `POST /api/agents/eval/:dappId` endpoint
- On daily cron sweep of top 20 most-viewed dApps

In-memory queue is fine for hackathon. Persist state to a single JSON file for restart recovery.

### Files
- NEW `backend/src/agents/orchestrator.ts`
- Wire to `backend/src/index.ts`

### Acceptance
- [ ] Submitting a new dApp on the frontend triggers an evaluation within 30s
- [ ] Manual POST endpoint works
- [ ] Recovers gracefully from restart mid-run

---

## #14 · Personal agent + MemWal user profile

**Labels:** `backend`, `agent`, `week-3`, `critical-path`
**Depends on:** #3, #4, plus at least one round of summary reports available

### Scope
The user-facing agent. Builds and maintains a per-user profile in MemWal, ranks recent summary reports against that profile, exposes `POST /api/agents/personal/:address` returning `{ recommendations, reasoning }`.

### MemWal schema
See `docs/ARCHITECTURE.md` §7.

### Endpoints
- `POST /api/agents/personal/recommend` — `{ address }` → ranked list
- `POST /api/agents/personal/chat` — `{ address, message, threadId? }` → streaming reply
- `GET  /api/agents/personal/profile/:address` — read profile (auth via wallet sig)
- `POST /api/agents/personal/profile/:address` — patch preferences

### Acceptance
- [ ] First call to `/recommend` for a new address builds a fresh profile (uses existing wallet-stats pipeline)
- [ ] Second call uses cached profile (proves persistence)
- [ ] Each recommendation includes a one-line "why this" pulled from specialist findings

---

## #15 · PersonalFeed UI component

**Labels:** `frontend`, `week-3`
**Depends on:** #14

### Scope
Replaces or augments `TrendingDashboard` on home with a personalized feed when wallet is connected. Each card has the verdict badge + "why this" line.

### Files
- NEW `mamiwaterf/src/components/PersonalFeed.tsx`
- NEW `mamiwaterf/src/hooks/usePersonalRecs.ts`
- Update `mamiwaterf/src/pages/HomePage.tsx`

### Acceptance
- [ ] Logged-out users see existing TrendingDashboard
- [ ] Logged-in users see personalized feed with "Why this?" expand
- [ ] Accept / Reject buttons fire history events to backend

---

## #16 · MemoryInspector page

**Labels:** `frontend`, `week-4`
**Depends on:** #14

### Scope
A page at `/memory` where the connected user can inspect every MemWal entry under their address, see when it was written, and delete entries. **The Walrus track problem statement explicitly calls for this.**

### Files
- NEW `mamiwaterf/src/pages/MemoryInspector.tsx`
- New route in `mamiwaterf/src/App.tsx`

### Acceptance
- [ ] Lists profile, history, conversations, wallet-summary
- [ ] Delete works and confirms via toast
- [ ] Mobile-responsive (this slide gets screenshotted for judges)

---

## #17 · AgentChat — conversational personal agent

**Labels:** `frontend`, `week-4`
**Depends on:** #14

### Scope
A sidebar / modal chat with the personal agent. Streams responses. Persists conversation thread id to MemWal so reconnecting picks up where you left off.

### Files
- NEW `mamiwaterf/src/components/AgentChat.tsx`
- NEW `mamiwaterf/src/hooks/useAgentChat.ts` — SSE streaming

### Acceptance
- [ ] Streaming response, no blocking spinner
- [ ] Quote-of-evidence: when agent says "I recommend Cetus", it cites the AgentReport blob

---

## #18 · Referral Move module + click tracking

**Labels:** `move`, `tx-layer`, `week-3`
**Depends on:** none on contract; needs UI wiring after deploy

### Scope
New Move package `referrals/` with:
- `ReferralProgram` shared object per partner dApp, holding `{package_id, bps, treasury, active}`
- `record_click(program, user, clock)` — emits event, indexes by user
- `claim_referral(program, user_tx_digest, ...)` — verifies user transacted on the partner package within 24h of click, pays out

### Files
- NEW `referrals/Move.toml`
- NEW `referrals/sources/referrals.move`
- NEW endpoint `backend/api/referrals/click` to record clicks
- New badge on dApp cards when referral is active

### Acceptance
- [ ] End-to-end demo: register program → user clicks → user transacts → claim succeeds
- [ ] Negative test: claim fails if user didn't transact in window

---

## #19 · Tip jar — tip an agent in SUI

**Labels:** `move`, `tx-layer`, `frontend`, `week-3`

### Scope
Tip jar Move module + UI button on each AgentReport. Each agent kind has a treasury address; users send SUI directly via a Move call (so it shows up in tx history with the dApp + agent kind in the event).

### Files
- NEW `tips/Move.toml` + `tips/sources/tips.move` (or extend `agent_reports` with an entry fun if simpler)
- New "Tip this agent" button on `AgentReportPanel`

### Acceptance
- [ ] Tip lands in the right treasury
- [ ] Event includes `agent_kind` so we can aggregate "most-tipped specialist" stats

---

## #20 · Render deployment for backend agent service

**Labels:** `infra`, `week-4`
**Depends on:** #3 (need real backend code to deploy)

### Scope
Deploy the backend to Render as a web service. Single Dockerfile, env vars wired, GitHub-integrated auto-deploy from `main`.

### Files
- NEW `backend/Dockerfile`
- NEW `backend/.dockerignore`
- NEW `render.yaml` at repo root
- Health-check endpoint already exists (`/health`)

### Env vars to set on Render
- `ANTHROPIC_API_KEY`
- `MEMWAL_ACCOUNT_ID` + `MEMWAL_DELEGATE_KEY`
- `ENOKI_API_KEY` + `ADMIN_SECRET_KEY` + `INDEXER_CAP_ID`
- `AGENT_REPORTS_PACKAGE_ID` + `AGENT_REPORTS_REGISTRY_ID` + `AGENT_CAP_ID`
- `SUI_NETWORK=testnet`

### Acceptance
- [ ] Public URL responding at `/health`
- [ ] One agent run triggered via `/api/agents/eval/:dappId` from the deployed URL
- [ ] Free tier cold-start documented in README

---

## How to claim and ship an issue

1. Comment "I'll take this" on the GitHub issue and set yourself as assignee
2. Branch from `main`: `git checkout -b feat/<issue-number>-<short-desc>`
3. Land all changes for your issue in a single PR — keep PRs scoped to one issue
4. Reference the issue in your commit message and PR description
5. PRs need a review before merge — even a quick one from any other contributor

Build the issues you depend on first. If you're blocked, comment on your issue + the blocker so it's visible.
