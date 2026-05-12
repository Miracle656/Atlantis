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

function apiKey(): string {
  const k = process.env.BLOCKBERRY_API_KEY;
  if (!k) {
    throw new Error(
      'BLOCKBERRY_API_KEY is not set. See backend/.env.example. Metrics specialist will still run but Blockberry queries will fail.'
    );
  }
  return k;
}

async function bbFetch(path: string): Promise<unknown> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BLOCKBERRY_BASE}${path}`, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'x-api-key': apiKey(), accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Blockberry ${res.status} ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

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
      // Try DeFi list first, then DEX list — match against any package address.
      const [defi, dex] = await Promise.allSettled([
        bbFetch('/widgets/defi/list?orderBy=DESC&sortBy=CURR_TVL&page=0&size=200'),
        bbFetch('/widgets/dexes/list?orderBy=DESC&sortBy=VOLUME&page=0&size=200'),
      ]);

      const defiContent = extractContent(defi);
      const dexContent = extractContent(dex);

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

function extractContent(r: PromiseSettledResult<unknown>): Array<Record<string, unknown> & { packages?: Array<{ packageAddress?: string }>; projectName?: string; currTvl?: number; txsCount?: number; volume24H?: number; volume?: number; volume7d?: number; volume30d?: number; socialWebsite?: string; socialTwitter?: string }> {
  if (r.status !== 'fulfilled') return [];
  const data = r.value as { content?: unknown[] };
  return Array.isArray(data?.content) ? (data.content as never[]) : [];
}

/** Convenience: all Blockberry tools as an array. */
export const blockberryTools = [findProjectByPackageTool];
