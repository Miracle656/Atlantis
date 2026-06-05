/**
 * Personal agent for ATLANTIS.
 *
 * This is the user-facing half of the system — the agent that *remembers
 * you*. Two responsibilities:
 *
 *   1. syncWalletProfile(address)
 *      Pulls the wallet's recent on-chain behaviour from Blockberry,
 *      distils it into plain-English facts, and stores them in the user's
 *      MemWal namespace (`atlantis-user-{address}`). These persist across
 *      sessions and devices — the durable, portable memory the Walrus track
 *      is about.
 *
 *   2. rankFeed({ address, candidates })
 *      Recalls what we remember about the user, then ranks candidate dApps
 *      (already carrying the specialist agents' verdict + score) against the
 *      user's actual behaviour, with a one-line "why this" per pick and
 *      explicit risk warnings.
 *
 * The ranking reuses the same tool-use loop the specialists use: the agent
 * recalls user memory, then terminates by calling `submit_finding` with the
 * ranked list.
 */

import { runAgent, submitFindingTool } from './runtime/claude';
import { recall, analyzeAndRemember, userNamespace } from './runtime/memwal';
import type { ModelTrace, ToolDefinition } from './runtime/types';

const MODEL = 'claude-sonnet-4-6';
const AGENT_VERSION = 'claude-sonnet-4-6@personal-v1';
const BLOCKBERRY_BASE = 'https://api.blockberry.one/sui/v1';
const TRADEPORT_ENDPOINT = 'https://api.indexer.xyz/graphql';
const TIMEOUT_MS = 10_000;
const MIST_PER_SUI = 1_000_000_000;

// ============================================================
// Public types
// ============================================================

export interface WalletProfile {
  address: string;
  txCount: number;
  gasSpent: number;
  topProjects: string[];
  topCoins: Array<{ symbol: string; usdValue: number }>;
  /** NFT collections the wallet holds, most-held first. */
  topNftCollections: Array<{ title: string; count: number; floorSui: number; verified: boolean }>;
  activityTypes: string[];
  generatedAt: number;
}

export interface FeedCandidate {
  dappId: string;
  name: string;
  category: string;
  tagline?: string;
  /** Composite score from the summary AgentReport, if evaluated. 0..100. */
  score?: number;
  /** "green" | "yellow" | "red" — the on-chain verdict, if evaluated. */
  verdict?: string;
}

export interface RankedPick {
  dappId: string;
  reason: string;
}

export interface PersonalFeedResult {
  ranked: RankedPick[];
  warnings: RankedPick[];
  /** Memories the agent recalled while ranking — surfaced for transparency. */
  memoryUsed: string[];
  trace?: ModelTrace;
}

// ============================================================
// Blockberry wallet fetch (read-only, server-side)
// ============================================================

async function bbGet(path: string): Promise<any | null> {
  const key = process.env.BLOCKBERRY_API_KEY;
  if (!key) return null;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BLOCKBERRY_BASE}${path}`, {
      signal: controller.signal,
      headers: { 'x-api-key': key, accept: '*/*' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Pull the wallet's NFT holdings from TradePort and aggregate per collection.
 * Returns [] if the key is missing or the request fails (non-fatal).
 */
async function fetchNftHoldings(
  address: string
): Promise<Array<{ title: string; count: number; floorSui: number; verified: boolean }>> {
  const key = process.env.TRADEPORT_API_KEY;
  const user = process.env.TRADEPORT_API_USER || 'atlantis';
  if (!key) return [];

  const query = `query walletNfts($owner: String!, $limit: Int!) {
    sui { nfts(where: { owner: { _eq: $owner } }, limit: $limit, offset: 0) {
      collection { title floor verified }
    } }
  }`;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(TRADEPORT_ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'x-api-user': user },
      body: JSON.stringify({ query, variables: { owner: address, limit: 25 } }),
    });
    if (!res.ok) return [];
    const json: any = await res.json();
    const nfts: any[] = json?.data?.sui?.nfts ?? [];
    const byCollection = new Map<string, { title: string; count: number; floorSui: number; verified: boolean }>();
    for (const n of nfts) {
      const c = n?.collection;
      if (!c?.title) continue;
      const existing = byCollection.get(c.title);
      if (existing) existing.count += 1;
      else
        byCollection.set(c.title, {
          title: c.title,
          count: 1,
          floorSui: Number(((Number(c.floor) || 0) / MIST_PER_SUI).toFixed(3)),
          verified: !!c.verified,
        });
    }
    return [...byCollection.values()].sort((a, b) => b.count - a.count).slice(0, 8);
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

/** Pull recent activity + coin holdings and distil into a WalletProfile. */
export async function fetchWalletProfile(address: string): Promise<WalletProfile> {
  const [activity, coins, nftCollections] = await Promise.all([
    bbGet(`/accounts/${address}/activity?actionType=ALL&size=50&orderBy=DESC`),
    bbGet(`/coins/wallet/${address}?size=10&orderBy=DESC&sortBy=USD_VALUE`),
    fetchNftHoldings(address),
  ]);

  const acts: any[] = Array.isArray(activity?.content) ? activity.content : [];
  const coinList: any[] = Array.isArray(coins?.content) ? coins.content : [];

  // Distinct projects the wallet has touched.
  const projectCounts = new Map<string, number>();
  const activityTypes = new Set<string>();
  let gasSpent = 0;
  for (const a of acts) {
    gasSpent += Number(a?.gasFee) || 0;
    for (const at of a?.activityType ?? []) activityTypes.add(String(at));
    for (const w of a?.activityWith ?? []) {
      const name = w?.projectName || w?.name;
      if (name) projectCounts.set(name, (projectCounts.get(name) ?? 0) + 1);
    }
  }
  const topProjects = [...projectCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name]) => name);

  const topCoins = coinList
    .map((c) => {
      const bal = Number(c?.totalBalance) || 0;
      const dec = Number(c?.decimals) || 0;
      const price = Number(c?.coinPrice) || 0;
      return { symbol: String(c?.coinSymbol ?? '?'), usdValue: (bal / 10 ** dec) * price };
    })
    .filter((c) => c.usdValue > 0)
    .slice(0, 6);

  return {
    address,
    txCount: acts.length,
    gasSpent: Number(gasSpent.toFixed(4)),
    topProjects,
    topCoins,
    topNftCollections: nftCollections,
    activityTypes: [...activityTypes].slice(0, 10),
    generatedAt: Date.now(),
  };
}

// ============================================================
// 1. Sync wallet profile → MemWal
// ============================================================

/**
 * Build the wallet profile and persist it as facts in the user's MemWal
 * namespace. analyzeAndRemember extracts individual recallable facts (one
 * per project / holding) so the ranking agent can semantically recall them.
 */
export async function syncWalletProfile(address: string): Promise<WalletProfile> {
  const profile = await fetchWalletProfile(address);
  const ns = userNamespace(address);

  const narrative = [
    `Wallet ${address} on-chain behaviour summary (as of ${new Date(profile.generatedAt).toISOString()}):`,
    `Has ~${profile.txCount} recent transactions and has spent about ${profile.gasSpent} SUI in gas.`,
    profile.topProjects.length
      ? `Frequently interacts with these dApps/protocols: ${profile.topProjects.join(', ')}.`
      : `Has no notable dApp interactions yet.`,
    profile.topCoins.length
      ? `Holds these tokens (by USD value): ${profile.topCoins.map((c) => `${c.symbol} ($${c.usdValue.toFixed(2)})`).join(', ')}.`
      : `Holds no significant token balances.`,
    profile.topNftCollections.length
      ? `Holds NFTs from these collections (count): ${profile.topNftCollections.map((c) => `${c.title} (${c.count}${c.verified ? ', verified' : ''})`).join(', ')}. This signals the user collects NFTs and is interested in the NFT category.`
      : `Holds no NFTs currently — may be less interested in the NFT category.`,
    profile.activityTypes.length
      ? `Recent on-chain action types: ${profile.activityTypes.join(', ')}.`
      : ``,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    await analyzeAndRemember(narrative, ns);
  } catch (err) {
    // Memory write failing shouldn't break the sync — the caller still gets
    // the profile and can retry. Log and continue.
    console.error(`[personal] analyzeAndRemember failed for ${address}:`, err);
  }

  return profile;
}

// ============================================================
// 2. Rank the personalised feed
// ============================================================

const RANK_SCHEMA: ToolDefinition['input_schema'] = {
  type: 'object',
  properties: {
    ranked: {
      type: 'array',
      description: 'Candidate dApps ordered best-first for THIS user. Only include dApps from the provided candidate list.',
      items: {
        type: 'object',
        properties: {
          dappId: { type: 'string', description: 'The candidate dApp id.' },
          reason: { type: 'string', description: 'One short sentence: why this fits THIS user, grounded in their memory/behaviour.' },
        },
        required: ['dappId', 'reason'],
      },
    },
    warnings: {
      type: 'array',
      description: 'dApps the user should be cautious about (e.g. red/yellow verdict, or mismatched with their risk profile). May be empty.',
      items: {
        type: 'object',
        properties: {
          dappId: { type: 'string' },
          reason: { type: 'string', description: 'One short sentence stating the risk.' },
        },
        required: ['dappId', 'reason'],
      },
    },
  },
  required: ['ranked', 'warnings'],
};

const SYSTEM_PROMPT = `You are the PERSONAL agent for ATLANTIS — a Sui dApp discovery assistant that remembers each user.

Your job: given a list of candidate dApps (each already carrying a verdict + score written by independent evaluator agents) and what you can recall about this user's on-chain behaviour, produce a PERSONALISED ranking.

PROCESS
1. Call \`recall_my_memory\` one or more times to learn what this user actually does on-chain — which protocols they use, what tokens and NFTs they hold, their apparent risk appetite. Query for things relevant to the candidates (e.g. "lending", "DEX usage", "stablecoins", "NFT collections held"). When NFT collections are among the candidates, recall the user's NFT holdings and interests.
2. Rank the candidates best-first FOR THIS USER. Weigh: fit with their demonstrated behaviour and holdings, the evaluator score/verdict (favour green/high score, be wary of red/low), and category relevance.
3. Surface warnings for any candidate that is red-verdict, very low score, or a poor fit for their risk profile.
4. Call \`submit_finding\` exactly once with the ranked list and warnings.

RULES
- Only reference dApps from the provided candidate list — never invent ids.
- Every reason must be one short, concrete sentence. Ground it in recalled behaviour when possible ("you regularly use lending protocols"), not generic praise.
- If memory recall returns nothing, rank primarily by verdict/score and category, and say the recommendation is not yet personalised.`;

function recallMyMemoryTool(ns: string, captured: string[]): ToolDefinition<{ query: string; limit?: number }, string> {
  return {
    name: 'recall_my_memory',
    description:
      "Semantic search over what ATLANTIS remembers about THIS user's on-chain behaviour, holdings, and preferences. Returns the most relevant facts for your query.",
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What you want to know about the user.' },
        limit: { type: 'integer', minimum: 1, maximum: 20, description: 'Max results (default 6).' },
      },
      required: ['query'],
    },
    async execute({ query, limit }) {
      const res = await recall(query, ns, limit ?? 6);
      const rows = (res?.results ?? []) as Array<{ text: string; distance: number }>;
      for (const r of rows) if (!captured.includes(r.text)) captured.push(r.text);
      if (!rows.length) return 'No memory found about this user yet. Rank by verdict/score and category instead.';
      return JSON.stringify(rows.map((r) => ({ text: r.text, distance: r.distance })), null, 2);
    },
  };
}

export async function rankFeed(args: {
  address: string;
  candidates: FeedCandidate[];
}): Promise<PersonalFeedResult> {
  const { address, candidates } = args;
  const ns = userNamespace(address);
  const memoryUsed: string[] = [];

  // Trim candidate payload to what the model needs.
  const slim = candidates.slice(0, 30).map((c) => ({
    dappId: c.dappId,
    name: c.name,
    category: c.category,
    tagline: c.tagline ?? '',
    score: c.score ?? null,
    verdict: c.verdict ?? 'unrated',
  }));

  const userMessage = [
    `User wallet: ${address}`,
    ``,
    `Candidate dApps (JSON):`,
    JSON.stringify(slim, null, 2),
    ``,
    `Recall this user's behaviour with recall_my_memory, then submit_finding with the ranked list + warnings.`,
  ].join('\n');

  const run = await runAgent<{ ranked: RankedPick[]; warnings: RankedPick[] }>({
    agentKind: 'personal',
    agentVersion: AGENT_VERSION,
    system: SYSTEM_PROMPT,
    userMessage,
    model: MODEL,
    tools: [recallMyMemoryTool(ns, memoryUsed), submitFindingTool(RANK_SCHEMA)],
    caps: { maxTurns: 8, maxTokens: 30_000 },
    metadata: { address, agent: 'personal' },
  });

  const out = run.output ?? { ranked: [], warnings: [] };

  // Keep only valid candidate ids; the model is instructed not to invent, but verify.
  const validIds = new Set(candidates.map((c) => c.dappId));
  const ranked = (out.ranked ?? []).filter((r) => validIds.has(r.dappId));
  const warnings = (out.warnings ?? []).filter((r) => validIds.has(r.dappId));

  return { ranked, warnings, memoryUsed, trace: run.trace };
}

// ============================================================
// 3. Read memory (transparency / inspector)
// ============================================================

/** Semantic recall over a user's memory namespace — powers the memory view. */
export async function recallUserMemory(
  address: string,
  query: string,
  limit = 12
): Promise<Array<{ text: string; distance: number }>> {
  const ns = userNamespace(address);
  const res = await recall(query || 'summary of this user', ns, limit);
  return ((res?.results ?? []) as Array<{ text: string; distance: number }>).map((r) => ({
    text: r.text,
    distance: r.distance,
  }));
}
