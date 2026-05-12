/**
 * Tokenomics specialist agent for ATLANTIS.
 *
 * Looks for a coin / token associated with the dApp's package, then
 * audits its supply, mint authority, treasury balance, and recent
 * transfer activity. Many dApps have no token at all — for those,
 * returns green with confidence ~0.4 and an info-level note.
 */

import { runAgent, submitFindingTool } from '../runtime/claude';
import { suiCoinTools, getMoveModulesTool, recentPackageTxsTool } from '../tools/sui_query';
import { memwalToolsForRound } from '../tools/memwal_tools';
import type { SpecialistInput } from '../runtime/types';
import {
  SUBMIT_FINDING_SCHEMA,
  abortedFinding,
  finalizeSpecialistRun,
  type ModelFinding,
  type SpecialistRunResult,
} from './_base';

const AGENT_KIND = 'tokenomics' as const;
const AGENT_VERSION = 'claude-sonnet-4-6@tokenomics-v1';
const MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `You are the TOKENOMICS specialist agent for ATLANTIS.

Your job: determine whether a Sui dApp has a token and, if so, evaluate its tokenomics risk.

PROCESS
1. Use \`get_move_modules\` to scan the dApp's package for coin / currency definitions (structs with the \`drop\` ability that look like phantom-typed coin witnesses, or modules that call \`coin::create_currency\`).
2. If you find a coin type, call \`get_coin_metadata\` and \`get_total_supply\` for it.
3. Use \`get_object\` to inspect any TreasuryCap or admin objects you find.
4. Use \`recent_package_txs\` to look for recent mint events or large transfers from the deployer / treasury.
5. Use \`observe\` to share notes with other specialists in this round.
6. Call \`submit_finding\` exactly once when you're done.

NO TOKEN FOUND
If after careful inspection the dApp clearly has no token (it's purely utility — e.g., a wallet, indexer, or NFT-only marketplace), return:
- verdict: green
- score: 75
- confidence: 0.4
- findings: one info-level "No token detected" note explaining what you searched
- recommendations: empty
This is a valid outcome — don't fabricate token analysis.

RED FLAGS (when there IS a token)
- Mint function reachable without TreasuryCap-style gating.
- TreasuryCap held by a plain address (not burned, not in a multisig, not frozen).
- Total supply far below any declared cap, implying unannounced future minting.
- Recent large transfers from deployer or treasury to fresh wallets (rug signal).
- Token type used by entry functions whose authority can be transferred by any caller.

VERDICT RUBRIC
- green  (score 80-100): clear, capped supply; mint authority neutralized; no suspicious recent activity.
- yellow (score 50-79):  uncertainties — mint authority unclear, partial info, recent moderate transfers.
- red    (score 0-49):   confirmed risk — uncapped mint, deployer-controlled treasury, recent dump-style transfers.

CONFIDENCE
0..1. Lower confidence when you couldn't fetch coin metadata or supply for a token you suspect exists. Cite only what you actually retrieved.`;

const TOOLS = [...suiCoinTools, getMoveModulesTool, recentPackageTxsTool];

export async function runTokenomicsSpecialist(
  input: SpecialistInput
): Promise<SpecialistRunResult> {
  if (!input.packageId) {
    return finalizeSpecialistRun({
      input,
      agentKind: AGENT_KIND,
      agentVersion: AGENT_VERSION,
      model: MODEL,
      modelOutput: {
        verdict: 'green',
        score: 70,
        confidence: 0.1,
        findings: [
          {
            severity: 'info',
            title: 'No package id — token analysis skipped',
            detail:
              'The dApp registration did not include a `package_id`, so no on-chain token check was possible. Treat as no token detected.',
          },
        ],
        recommendations: [],
      },
    });
  }

  const memwalTools = memwalToolsForRound(input.roundId);

  const run = await runAgent<ModelFinding>({
    agentKind: AGENT_KIND,
    agentVersion: AGENT_VERSION,
    system: SYSTEM_PROMPT,
    userMessage: buildUserMessage(input),
    model: MODEL,
    tools: [...TOOLS, ...memwalTools, submitFindingTool(SUBMIT_FINDING_SCHEMA)],
    caps: { maxTurns: 12, maxTokens: 40_000 },
    metadata: { dappId: input.dappId, roundId: input.roundId, agent: AGENT_KIND },
  });

  return finalizeSpecialistRun({
    input,
    agentKind: AGENT_KIND,
    agentVersion: AGENT_VERSION,
    model: MODEL,
    modelOutput:
      run.output ??
      abortedFinding(`Stop reason: ${run.stopReason}. ${run.error?.message ?? ''}`.trim()),
    trace: run.trace,
  });
}

function buildUserMessage(input: SpecialistInput): string {
  const meta = input.metadata;
  return [
    `Evaluate this dApp's tokenomics.`,
    ``,
    `dApp:        ${meta.name}`,
    `tagline:     ${meta.tagline}`,
    `category:    ${meta.category}`,
    `dapp id:     ${input.dappId}`,
    `package id:  ${input.packageId}`,
    `round id:    ${input.roundId}`,
    ``,
    `Start by reading the Move modules with get_move_modules to find any coin definitions. If none, return the "No token detected" outcome described in your system prompt. Use observe() to share notes. Call submit_finding once when you're done.`,
  ].join('\n');
}
