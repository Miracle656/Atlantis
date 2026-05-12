/**
 * Walrus client for ATLANTIS agents.
 *
 * Ported from `mamiwaterf/src/walrus.ts` with the same publisher/
 * aggregator fallback lists, plus `writeJson` and `fetchJson` helpers
 * for the structured agent output payloads. Uses node 18+ global fetch.
 */

// Keep these lists in sync with mamiwaterf/src/constants.ts.
// When the frontend list changes, mirror it here.
export const WALRUS_PUBLISHERS = [
  'https://walrus-testnet-publisher.nodes.guru',
  'https://walrus-testnet-publisher.stakely.io',
  'https://publisher.walrus-testnet.walrus.space',
  'https://walrus-testnet-publisher.everstake.one',
  'https://walrus-testnet-publisher.chainbase.online',
  'https://publisher.testnet.walrus.atalma.io',
  'https://walrus-testnet-publisher.natsai.xyz',
  'https://walrus-testnet-publisher.nodeinfra.com',
];

export const WALRUS_AGGREGATORS = [
  'https://walrus-testnet-aggregator.nodes.guru/v1',
  'https://walrus-testnet-aggregator.stakely.io/v1',
  'https://aggregator.walrus-testnet.walrus.space/v1',
  'https://walrus-testnet-aggregator.everstake.one/v1',
  'https://walrus-testnet-aggregator.chainbase.online/v1',
  'https://aggregator.testnet.walrus.atalma.io/v1',
  'https://walrus-testnet-aggregator.natsai.xyz/v1',
  'https://walrus-testnet-aggregator.nodeinfra.com/v1',
];

const DEFAULT_EPOCHS = 30;
const FETCH_TIMEOUT_MS = 10_000;

/**
 * Upload a raw string/Buffer to Walrus. Returns the blob id.
 * Falls back across all publishers on failure.
 */
export async function upload(
  body: string | Uint8Array | Buffer,
  opts: { epochs?: number } = {}
): Promise<string> {
  const epochs = opts.epochs ?? DEFAULT_EPOCHS;
  const errors: Array<{ publisher: string; error: unknown }> = [];

  for (const publisher of WALRUS_PUBLISHERS) {
    try {
      const url = `${publisher}?epochs=${epochs}`;
      const res = await fetch(url, { method: 'PUT', body: body as BodyInit });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

      const data = (await res.json()) as WalrusUploadResponse;
      const blobId =
        data.newlyCreated?.blobObject?.blobId ??
        data.alreadyCertified?.blobId ??
        data.blobObject?.blobId;

      if (!blobId) throw new Error('Walrus response missing blobId');
      return blobId;
    } catch (err) {
      errors.push({ publisher, error: err });
    }
  }

  throw new Error(
    `Walrus upload failed on all ${WALRUS_PUBLISHERS.length} publishers. Last error: ${
      (errors[errors.length - 1]?.error as Error | undefined)?.message ?? 'unknown'
    }`
  );
}

/** Upload a JSON-serializable object. Returns the blob id. */
export async function writeJson(
  data: unknown,
  opts: { epochs?: number } = {}
): Promise<string> {
  return upload(JSON.stringify(data), opts);
}

/**
 * Fetch a blob's body as text. Falls back across all aggregators.
 * Returns `null` if every aggregator fails.
 */
export async function fetchText(blobId: string): Promise<string | null> {
  for (let i = 0; i < WALRUS_AGGREGATORS.length; i++) {
    const url = `${WALRUS_AGGREGATORS[i]}/${blobId}`;
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return await res.text();
    } catch {
      // try next aggregator
    }
  }
  return null;
}

/**
 * Fetch a blob and parse it as JSON. Returns `null` if any step fails.
 */
export async function fetchJson<T = unknown>(blobId: string): Promise<T | null> {
  const text = await fetchText(blobId);
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** Build a public aggregator URL for a blob id (no fetch performed). */
export function blobUrl(blobId: string, aggregatorIndex = 0): string {
  return `${WALRUS_AGGREGATORS[aggregatorIndex]}/${blobId}`;
}

// ============================================================
// Types from Walrus publisher response
// ============================================================

interface WalrusUploadResponse {
  newlyCreated?: { blobObject?: { blobId: string } };
  alreadyCertified?: { blobId: string };
  blobObject?: { blobId: string };
}
