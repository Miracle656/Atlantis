/**
 * Metrics specialist agent for ATLANTIS.
 *
 * Reads Blockberry's TVL/volume/tx-count for the package and recent
 * on-chain activity. Looks at trends — is engagement growing, flat,
 * or declining? Spots anomalies — sudden volume spikes (wash trading),
 * retention cliffs.
 *
 * Score is neutral (~50, green) when no signal is available — absence
 * of data is not a red flag on its own.
 */

import { runAgent, submitFindingTool } from '../runtime/claude';
import { recentPackageTxsTool } from '../tools/sui_query';
import { blockberryTools } from '../tools/blockberry';
import { memwalToolsForRound } from '../tools/memwal_tools';
import type { SpecialistInput } from '../runtime/types';
import {
  SUBMIT_FINDING_SCHEMA,
  abortedFinding,
  finalizeSpecialistRun,
  type ModelFinding,
  type SpecialistRunResult,
} from './_base';

const AGENT_KIND = 'metrics' as const;
const AGENT_VERSION = 'claude-sonnet-4-6@metrics-v1';
const MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `You are the METRICS specialist agent for ATLANTIS.

Your job: evaluate the on-chain health and traction of a Sui dApp.

PROCESS
1. Call \`find_blockberry_project\` to get TVL / volume / transaction count if Blockberry indexes this package.
2. Use \`recent_package_txs\` to inspect recent activity directly from chain. Look for the cadence and the variety of senders.
3. Use \`observe\` to share notes with other specialists in this round.
4. Call \`submit_finding\` exactly once when you're done.

WHAT GOOD LOOKS LIKE
- Diverse set of senders in recent_package_txs (not just the deployer).
- TVL > 0 and broadly stable or growing (when Blockberry has data).
- Healthy transaction frequency relative to dApp age.
- A mix of move calls (not just one repeated function).

RED FLAGS
- Recent activity entirely from one address (likely synthetic).
- Sudden volume spike with no corresponding user growth (wash trading).
- TVL collapsed >50% in a short window (panic exit / exploit aftermath).
- No on-chain activity since deployment — looks abandoned.

NEUTRAL CASES
- Blockberry has no record AND on-chain activity is light. Score around 50, verdict green, confidence ~0.3. Absence of data is not a red flag on its own — many real dApps are too small or too new for Blockberry.

VERDICT RUBRIC
- green  (score 80-100): healthy traction, diverse users, no anomalies.
- yellow (score 50-79):  thin data, light activity, or unclear trend.
- red    (score 0-49):   confirmed anomalies — wash-trading signature, sudden TVL collapse, abandoned-but-claiming-active.

CONFIDENCE
0..1. Down-weight when you're working only from a small recent_package_txs window or when Blockberry has no record.`;

const TOOLS = [...blockberryTools, recentPackageTxsTool];

export async function runMetricsSpecialist(
  input: SpecialistInput
): Promise<SpecialistRunResult> {
  if (!input.packageId) {
    return finalizeSpecialistRun({
      input,
      agentKind: AGENT_KIND,
      agentVersion: AGENT_VERSION,
      model: MODEL,
      modelOutput: {
        verdict: 'yellow',
        score: 50,
        confidence: 0.1,
        findings: [
          {
            severity: 'info',
            title: 'No package id — on-chain metrics unavailable',
            detail:
              'Without a package id we can\'t look up Blockberry stats or recent on-chain activity for this dApp.',
          },
        ],
        recommendations: [
          'Ask the dApp developer to add their deployed package id to the registry entry.',
        ],
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
    caps: { maxTurns: 10, maxTokens: 30_000 },
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
    `Evaluate this dApp's on-chain traction and health.`,
    ``,
    `dApp:        ${meta.name}`,
    `tagline:     ${meta.tagline}`,
    `category:    ${meta.category}`,
    `dapp id:     ${input.dappId}`,
    `package id:  ${input.packageId}`,
    `round id:    ${input.roundId}`,
    ``,
    `Start by calling find_blockberry_project. Then look at recent_package_txs. Use observe() to share notes. Call submit_finding once.`,
  ].join('\n');
}
