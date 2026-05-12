/**
 * Sui read-only tools exposed to specialist agents.
 *
 * Each export is a ToolDefinition the agent can call via Anthropic
 * tool-use. Outputs are kept compact — we strip bytecode, locations,
 * and other token-heavy noise that doesn't help the model reason.
 */

import type { ToolDefinition } from '../runtime/types';
import {
  getMoveModules,
  getObject,
  recentPackageTxs,
  suiClient,
} from '../runtime/sui';

const MAX_TX_LIMIT = 25;
const MAX_OUTPUT_CHARS = 12_000;

function clamp(s: string): string {
  if (s.length <= MAX_OUTPUT_CHARS) return s;
  return s.slice(0, MAX_OUTPUT_CHARS) + `\n…[truncated ${s.length - MAX_OUTPUT_CHARS} chars]`;
}

// ============================================================
// get_move_modules
// ============================================================

interface GetMoveModulesInput {
  packageId: string;
}

export const getMoveModulesTool: ToolDefinition<GetMoveModulesInput, string> = {
  name: 'get_move_modules',
  description:
    'Fetch normalized Move source structure for a deployed package. Returns module names, struct definitions, function signatures (visibility, parameter types, return types), and capability gating info. Use this to inspect a dApp\'s contract for admin functions, mint authority, upgrade policy, and access control.',
  input_schema: {
    type: 'object',
    properties: {
      packageId: {
        type: 'string',
        description: 'The 0x-prefixed package id to inspect.',
      },
    },
    required: ['packageId'],
  },
  async execute({ packageId }) {
    const modules = await getMoveModules(packageId);

    // Trim each module to just the parts useful for security analysis.
    const trimmed: Record<string, unknown> = {};
    for (const [modName, mod] of Object.entries(modules)) {
      const m = mod as Record<string, unknown>;
      trimmed[modName] = {
        friends: m.friends ?? [],
        structs: trimStructs(m.structs),
        exposed_functions: trimFunctions(m.exposed_functions),
      };
    }

    return clamp(JSON.stringify(trimmed, null, 2));
  },
};

function trimStructs(structs: unknown): unknown {
  if (!structs || typeof structs !== 'object') return {};
  const out: Record<string, unknown> = {};
  for (const [name, s] of Object.entries(structs as Record<string, unknown>)) {
    const v = s as Record<string, unknown>;
    out[name] = {
      abilities: v.abilities,
      type_parameters: v.type_parameters,
      fields: v.fields,
    };
  }
  return out;
}

function trimFunctions(fns: unknown): unknown {
  if (!fns || typeof fns !== 'object') return {};
  const out: Record<string, unknown> = {};
  for (const [name, f] of Object.entries(fns as Record<string, unknown>)) {
    const v = f as Record<string, unknown>;
    out[name] = {
      visibility: v.visibility,
      is_entry: v.is_entry,
      type_parameters: v.type_parameters,
      parameters: v.parameters,
      return: v.return,
    };
  }
  return out;
}

// ============================================================
// get_object
// ============================================================

interface GetObjectInput {
  objectId: string;
}

export const getObjectTool: ToolDefinition<GetObjectInput, string> = {
  name: 'get_object',
  description:
    'Fetch an on-chain object\'s type, owner, and content. Use this to inspect upgrade caps, admin caps, or other capabilities you find while reading Move modules. Returns null content if the object does not exist.',
  input_schema: {
    type: 'object',
    properties: {
      objectId: {
        type: 'string',
        description: 'The 0x-prefixed object id to fetch.',
      },
    },
    required: ['objectId'],
  },
  async execute({ objectId }) {
    const res = await getObject(objectId);
    const trimmed = {
      objectId: res.data?.objectId,
      type: res.data?.type,
      owner: res.data?.owner,
      content:
        res.data?.content && res.data.content.dataType === 'moveObject'
          ? {
              type: (res.data.content as { type: string }).type,
              fields: (res.data.content as { fields: unknown }).fields,
            }
          : null,
      error: res.error,
    };
    return clamp(JSON.stringify(trimmed, null, 2));
  },
};

// ============================================================
// recent_package_txs
// ============================================================

interface RecentTxInput {
  packageId: string;
  limit?: number;
}

export const recentPackageTxsTool: ToolDefinition<RecentTxInput, string> = {
  name: 'recent_package_txs',
  description:
    'List recent transactions that involved a package id (in descending time order). Each entry has digest, sender, status, and the move calls invoked. Use this to spot suspicious activity patterns: rapid admin calls, authority transfers, mints, or unusual senders.',
  input_schema: {
    type: 'object',
    properties: {
      packageId: { type: 'string', description: '0x-prefixed package id.' },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: MAX_TX_LIMIT,
        description: `Max number of transactions to return (1-${MAX_TX_LIMIT}, default 10).`,
      },
    },
    required: ['packageId'],
  },
  async execute({ packageId, limit }) {
    const cap = Math.min(Math.max(limit ?? 10, 1), MAX_TX_LIMIT);
    const txs = await recentPackageTxs(packageId, cap);

    const trimmed = txs.data.map((tx) => {
      const moveCalls: Array<{ module?: string; function?: string; package?: string }> = [];
      const kind = tx.transaction?.data.transaction;
      if (kind && kind.kind === 'ProgrammableTransaction') {
        for (const sub of kind.transactions ?? []) {
          if ('MoveCall' in sub) {
            const mc = (sub as { MoveCall: { package: string; module: string; function: string } }).MoveCall;
            moveCalls.push({
              package: mc.package,
              module: mc.module,
              function: mc.function,
            });
          }
        }
      }

      return {
        digest: tx.digest,
        sender: tx.transaction?.data.sender,
        status: tx.effects?.status?.status,
        timestampMs: tx.timestampMs,
        moveCalls,
      };
    });

    return clamp(JSON.stringify(trimmed, null, 2));
  },
};

// ============================================================
// get_coin_metadata  (used by tokenomics specialist)
// ============================================================

interface GetCoinMetadataInput {
  coinType: string;
}

export const getCoinMetadataTool: ToolDefinition<GetCoinMetadataInput, string> = {
  name: 'get_coin_metadata',
  description:
    'Fetch CoinMetadata for a Sui coin type (e.g. "0x...::module::COIN_NAME"). Returns symbol, name, decimals, description, and icon url if any. Returns null if the type is not a registered coin.',
  input_schema: {
    type: 'object',
    properties: {
      coinType: {
        type: 'string',
        description: 'Fully-qualified coin type string. Example: "0x2::sui::SUI".',
      },
    },
    required: ['coinType'],
  },
  async execute({ coinType }) {
    try {
      const meta = await suiClient().getCoinMetadata({ coinType });
      return clamp(JSON.stringify(meta, null, 2));
    } catch (err) {
      return JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
        coinType,
      });
    }
  },
};

// ============================================================
// get_total_supply  (used by tokenomics specialist)
// ============================================================

interface GetTotalSupplyInput {
  coinType: string;
}

export const getTotalSupplyTool: ToolDefinition<GetTotalSupplyInput, string> = {
  name: 'get_total_supply',
  description:
    'Return the on-chain total supply for a coin type. Use alongside get_coin_metadata when assessing whether a token is mintable beyond its current supply.',
  input_schema: {
    type: 'object',
    properties: {
      coinType: { type: 'string', description: 'Fully-qualified coin type string.' },
    },
    required: ['coinType'],
  },
  async execute({ coinType }) {
    try {
      const supply = await suiClient().getTotalSupply({ coinType });
      return JSON.stringify({ coinType, value: supply.value });
    } catch (err) {
      return JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
        coinType,
      });
    }
  },
};

/** Convenience export: all read-only Sui tools as an array. */
export const suiQueryTools = [getMoveModulesTool, getObjectTool, recentPackageTxsTool];

/** Tokenomics-specific subset. */
export const suiCoinTools = [getCoinMetadataTool, getTotalSupplyTool, getObjectTool];
