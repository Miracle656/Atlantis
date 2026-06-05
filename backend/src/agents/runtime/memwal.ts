/**
 * MemWal client wrapper for ATLANTIS agents.
 *
 * MemWal's native model is namespace + free-text memories with semantic
 * recall — not key/value structured storage. So we expose two flavors:
 *
 *   - userNamespace(address)  → per-user memory (profile, history, prefs)
 *   - evalNamespace(roundId)  → shared evaluator scratchpad for one round
 *
 * Specialists `remember()` their observations into the round's namespace
 * as plain English. The summarizer later `recall("findings about X")`s
 * to fuse them. The personal agent `recall()`s a user's namespace to
 * rank dApps against their actual behavior + preferences.
 *
 * Memories are encrypted via SEAL and stored on Walrus by the MemWal
 * relayer — we don't handle that here.
 */

import type { MemWal as MemWalSDK } from '@mysten-incubation/memwal';

// @mysten-incubation/memwal is ESM-only (its package "exports" map has an
// `import` condition but no `require`). The backend transpiles under ts-node
// as CommonJS, which down-levels a plain `await import(...)` into `require()`
// — and require() can't load an import-only package ("No exports main
// defined"). Wrapping import() in `new Function` hides it from the TS
// down-leveller so it stays a genuine ESM import at runtime, which Node
// resolves via the package's `import` condition.
const esmImport = new Function('m', 'return import(m)') as (
  m: string
) => Promise<any>;

let _memwal: MemWalSDK | null = null;
let _initPromise: Promise<MemWalSDK> | null = null;

/**
 * Lazy singleton — initializes on first use so import order doesn't matter.
 * Uses dynamic import because the MemWal package may ship as ESM.
 */
async function getClient(): Promise<MemWalSDK> {
  if (_memwal) return _memwal;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const key = process.env.MEMWAL_DELEGATE_KEY;
    const accountId = process.env.MEMWAL_ACCOUNT_ID;
    const serverUrl =
      process.env.MEMWAL_SERVER_URL ?? 'https://relayer.staging.memwal.ai';

    if (!key || !accountId) {
      throw new Error(
        'MEMWAL_DELEGATE_KEY and MEMWAL_ACCOUNT_ID must be set. See backend/.env.example.'
      );
    }

    // Per MemWal SDK docs, the constructor takes key/accountId/serverUrl
    // only — the namespace is supplied per-call in remember/recall.
    // esmImport (above) keeps this a real ESM import under CJS ts-node.
    const mod = await esmImport('@mysten-incubation/memwal');
    _memwal = mod.MemWal.create({
      key,
      accountId,
      serverUrl,
    }) as MemWalSDK;
    return _memwal;
  })();

  return _initPromise;
}

// ============================================================
// Namespace helpers
// ============================================================

/** All memory about one user (profile, on-chain summary, history, prefs). */
export function userNamespace(address: string): string {
  return `atlantis-user-${address.toLowerCase()}`;
}

/** Shared scratchpad for one evaluation round across all specialists. */
export function evalNamespace(roundId: number | string): string {
  return `atlantis-eval-${roundId}`;
}

/** Conversation thread with the personal agent. */
export function chatNamespace(address: string, threadId: string): string {
  return `atlantis-chat-${address.toLowerCase()}-${threadId}`;
}

// ============================================================
// Public helpers
// ============================================================

/**
 * Store a free-text memory in a namespace, wait for indexing to finish.
 * Returns the stored memory's metadata.
 */
export async function remember(text: string, namespace: string) {
  const client = await getClient();
  return client.rememberAndWait(text, namespace);
}

/**
 * Fire-and-forget store. Faster but caller can't recall it until the
 * relayer finishes indexing.
 */
export async function rememberAsync(text: string, namespace: string) {
  const client = await getClient();
  return client.remember(text, namespace);
}

/**
 * Extract individual facts from a longer text and store each as its own
 * memory. Useful when ingesting wallet summaries, dApp metadata, etc.
 */
export async function analyzeAndRemember(text: string, namespace: string) {
  const client = await getClient();
  return client.analyzeAndWait(text, namespace);
}

/**
 * Semantic recall — returns memories ranked by similarity to the query.
 * `limit` defaults to 8.
 */
export async function recall(query: string, namespace: string, limit = 8) {
  const client = await getClient();
  return client.recall(query, limit, namespace);
}

/**
 * Health check on the MemWal relayer. Useful for /health endpoints.
 */
export async function health() {
  const client = await getClient();
  return client.health();
}

/**
 * Rebuild the local index from Walrus blobs for a namespace.
 * Use after restarts or when adding a new replica.
 */
export async function restore(namespace: string, limit?: number) {
  const client = await getClient();
  return client.restore(namespace, limit);
}
