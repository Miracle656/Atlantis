/**
 * Blockberry tools for the metrics specialist.
 *
 * Wraps the same DeFi/DEX endpoints the frontend uses in
 * `mamiwaterf/src/utils/blockberry.ts`, but server-side and exposed
 * as agent tools. Returns trimmed records to keep token usage low.
 */

import type { ToolDefinition } from '../runtime/types';

const BLOCKBERRY_BASE = 'https://api.blockberry.one/sui/v1';
const TIMEOUT_MS = 10_000;
const MAX_PAGES = 5; // safety cap; registry is ~tens of dApps (50/page)

// The DeFi endpoint requires an explicit category filter in the body.
const DEFI_CATEGORIES = [
  'BRIDGE', 'DEX', 'LENDING', 'YIELD', 'CDP', 'LAUNCHPAD',
  'LIQUID_STAKING', 'RWA', 'ALGO_STABLES', 'SYNTHETICS', 'PAYMENTS', 'DERIVATIVES',
];

function apiKey(): string {
  const k = process.env.BLOCKBERRY_API_KEY;
  if (!k) {
    throw new Error(
      'BLOCKBERRY_API_KEY is not set. See backend/.env.example. Metrics specialist will still run but Blockberry queries will fail.'
    );
  }
  return k;
}

interface BBPage { content?: unknown[]; totalPages?: number }

/**
 * POST to a Blockberry list endpoint. The list endpoints are POST (not GET)
 * and take a JSON body — the GET `widgets` list paths return 404.
 */
async function bbPost(path: string, body: unknown): Promise<BBPage> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BLOCKBERRY_BASE}${path}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'x-api-key': apiKey(),
        accept: '*/*',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Blockberry ${res.status} ${res.statusText}`);
    return (await res.json()) as BBPage;
  } finally {
    clearTimeout(t);
  }
}

/** Page through a Blockberry list endpoint and return all items. */
async function bbPostAll(
  buildPath: (page: number) => string,
  body: unknown
): Promise<Array<Record<string, unknown>>> {
  const all: Array<Record<string, unknown>> = [];
  let page = 0;
  let totalPages = 1;
  while (page < totalPages && page < MAX_PAGES) {
    const data = await bbPost(buildPath(page), body);
    if (Array.isArray(data.content)) all.push(...(data.content as Array<Record<string, unknown>>));
    totalPages = data.totalPages ?? 1;
    page++;
  }
  return all;
}

const fetchAllDefi = () =>
  bbPostAll(
    (p) => `/defi?page=${p}&size=50&orderBy=DESC&sortBy=CURRENT_TVL`,
    { categories: DEFI_CATEGORIES }
  );

const fetchAllDex = () =>
  bbPostAll(
    (p) => `/dex?page=${p}&size=50&orderBy=DESC&period=DAY&sortBy=CURRENT_TVL`,
    { withTvlOnly: false }
  );

// ============================================================
// find_project_by_package
// ============================================================

interface FindProjectInput {
  packageId: string;
}

/**
 * Look up a Blockberry DeFi/DEX project record matching a package id.
 * Returns trimmed metrics (TVL, txsCount, volume) — the fields the
 * metrics specialist actually reasons about.
 */
export const findProjectByPackageTool: ToolDefinition<FindProjectInput, string> = {
  name: 'find_blockberry_project',
  description:
    'Look up Blockberry stats (TVL, recent volume, transaction count) for a dApp by its smart-contract package id. Returns null when Blockberry has no record for the package. Use this to ground your metrics findings in third-party data.',
  input_schema: {
    type: 'object',
    properties: {
      packageId: {
        type: 'string',
        description: '0x-prefixed package id to match against Blockberry project records.',
      },
    },
    required: ['packageId'],
  },
  async execute({ packageId }) {
    try {
      // Page through DeFi + DEX lists, match against any package address.
      const [defi, dex] = await Promise.allSettled([fetchAllDefi(), fetchAllDex()]);

      const defiContent = extractItems(defi);
      const dexContent = extractItems(dex);

      const allItems = [
        ...defiContent.map((x) => ({ ...x, _kind: 'defi' })),
        ...dexContent.map((x) => ({ ...x, _kind: 'dex' })),
      ];

      const match = allItems.find((p) =>
        Array.isArray(p.packages) &&
        p.packages.some(
          (pkg) =>
            typeof pkg?.packageAddress === 'string' &&
            pkg.packageAddress.toLowerCase() === packageId.toLowerCase()
        )
      );

      if (!match) return JSON.stringify({ packageId, found: false });

      return JSON.stringify({
        packageId,
        found: true,
        kind: match._kind,
        name: match.projectName,
        tvl: match.currTvl ?? null,
        txsCount: match.txsCount ?? null,
        volume24h: match.volume24H ?? match.volume ?? null,
        volume7d: match.volume7d ?? null,
        volume30d: match.volume30d ?? null,
        socialWebsite: match.socialWebsite ?? null,
        socialTwitter: match.socialTwitter ?? null,
      });
    } catch (err) {
      return JSON.stringify({
        packageId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },
};

type BBItem = Record<string, unknown> & {
  packages?: Array<{ packageAddress?: string }>;
  projectName?: string;
  currTvl?: number;
  txsCount?: number;
  volume24H?: number;
  volume?: number;
  volume7d?: number;
  volume30d?: number;
  socialWebsite?: string;
  socialTwitter?: string;
};

function extractItems(r: PromiseSettledResult<Array<Record<string, unknown>>>): BBItem[] {
  return r.status === 'fulfilled' ? (r.value as BBItem[]) : [];
}

/** Convenience: all Blockberry tools as an array. */
export const blockberryTools = [findProjectByPackageTool];
