/**
 * Sui chain integration for the agent runtime.
 *
 * Two responsibilities:
 *   1. Submit `agent_reports::publish_report` transactions signed by the
 *      backend's AgentCap holder.
 *   2. Read helpers (latest_summary, dApp metadata) used by specialists
 *      and the personal agent.
 *
 * The signer key + on-chain object ids come from environment variables
 * — see backend/.env.example.
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import {
  VERDICT_CODE,
  type PublishReportInput,
  type PublishReportResult,
} from './types';

const CLOCK_ID = '0x6';
const MODULE_NAME = 'agent_reports';

// ============================================================
// Lazy singletons
// ============================================================

let _client: SuiClient | null = null;
let _signer: Ed25519Keypair | null = null;

function network(): 'testnet' | 'mainnet' {
  const n = process.env.SUI_NETWORK ?? 'testnet';
  return n === 'mainnet' ? 'mainnet' : 'testnet';
}

export function suiClient(): SuiClient {
  if (_client) return _client;
  _client = new SuiClient({ url: getFullnodeUrl(network()) });
  return _client;
}

export function agentSigner(): Ed25519Keypair {
  if (_signer) return _signer;
  // AGENT_SECRET_KEY is the AgentCap-holder. Kept separate from
  // ADMIN_SECRET_KEY (which holds the mamiwaterc IndexerCap for the
  // verification flow) so a leak of one cap doesn't compromise the other.
  const key = process.env.AGENT_SECRET_KEY;
  if (!key) {
    throw new Error(
      'AGENT_SECRET_KEY is not set. The backend agent signer must hold AgentCap. See backend/.env.example.'
    );
  }
  // Supports bech32 (suiprivkey1...) via decodeSuiPrivateKey internally,
  // and a raw 32-byte hex/Uint8Array.
  _signer = Ed25519Keypair.fromSecretKey(key);
  return _signer;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `${name} is not set. Run 'sui client publish' on agent_reports/ and put the ids in backend/.env. See issue #1.`
    );
  }
  return v;
}

// ============================================================
// publish_report
// ============================================================

/**
 * Sign and submit `agent_reports::publish_report`. Returns the tx digest
 * and the id of the newly created AgentReport object.
 */
export async function publishReport(
  input: PublishReportInput
): Promise<PublishReportResult> {
  const packageId = requireEnv('AGENT_REPORTS_PACKAGE_ID');
  const registryId = requireEnv('AGENT_REPORTS_REGISTRY_ID');
  const agentCapId = requireEnv('AGENT_CAP_ID');

  const tx = new Transaction();

  tx.moveCall({
    target: `${packageId}::${MODULE_NAME}::publish_report`,
    arguments: [
      tx.object(agentCapId),
      tx.object(registryId),
      tx.pure.id(input.dappId),
      tx.pure.string(input.agentKind),
      tx.pure.string(input.agentVersion),
      tx.pure.string(input.reportBlobId),
      input.memwalThread
        ? tx.pure.option('string', input.memwalThread)
        : tx.pure.option('string', null),
      tx.pure.u8(VERDICT_CODE[input.verdict]),
      tx.pure.u8(clampScore(input.score)),
      tx.pure.u64(BigInt(input.roundId)),
      tx.object(CLOCK_ID),
    ],
  });

  const result = await suiClient().signAndExecuteTransaction({
    signer: agentSigner(),
    transaction: tx,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });

  if (result.effects?.status?.status !== 'success') {
    throw new Error(
      `publish_report failed: ${result.effects?.status?.error ?? 'unknown'}`
    );
  }

  // The created AgentReport is a frozen object. Find it in objectChanges.
  const created = result.objectChanges?.find(
    (c) =>
      c.type === 'created' &&
      c.objectType.includes(`::${MODULE_NAME}::AgentReport`)
  ) as { objectId: string } | undefined;

  if (!created) {
    throw new Error('publish_report succeeded but no AgentReport object was created');
  }

  return { digest: result.digest, reportId: created.objectId };
}

function clampScore(s: number): number {
  if (!Number.isFinite(s)) return 0;
  const r = Math.round(s);
  if (r < 0) return 0;
  if (r > 100) return 100;
  return r;
}

// ============================================================
// Read helpers (used by specialists + personal agent)
// ============================================================

/**
 * Fetch a Sui object's full content. Thin wrapper so callers don't need
 * to import SuiClient directly.
 */
export async function getObject(objectId: string) {
  return suiClient().getObject({
    id: objectId,
    options: {
      showContent: true,
      showType: true,
      showOwner: true,
    },
  });
}

/**
 * Get a package's normalized Move modules — used by the security
 * specialist to inspect a dApp's code.
 */
export async function getMoveModules(packageId: string) {
  return suiClient().getNormalizedMoveModulesByPackage({ package: packageId });
}

/**
 * Query recent transactions touching a package id.
 * Used by metrics + security specialists.
 */
export async function recentPackageTxs(packageId: string, limit = 25) {
  return suiClient().queryTransactionBlocks({
    filter: { InputObject: packageId },
    options: { showEffects: true, showInput: true, showEvents: true },
    limit,
    order: 'descending',
  });
}
