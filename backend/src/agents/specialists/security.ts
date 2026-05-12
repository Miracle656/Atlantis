/**
 * Security specialist agent for ATLANTIS.
 *
 * Reads a dApp's Move package + recent on-chain activity, identifies
 * common red flags (admin functions without capability gates, mint
 * authority without supply caps, upgradeable packages without timelock,
 * authority transfer reachable by any caller, etc.), writes a structured
 * SpecialistOutput to Walrus, and publishes a pointer on-chain via the
 * agent_reports module.
 *
 * Always produces *some* report — even on failure — so the audit trail
 * shows the agent ran.
 */

import { runAgent, submitFindingTool } from '../runtime/claude';
import { suiQueryTools } from '../tools/sui_query';
import { memwalToolsForRound } from '../tools/memwal_tools';
import type { SpecialistInput } from '../runtime/types';
import {
  SUBMIT_FINDING_SCHEMA,
  abortedFinding,
  finalizeSpecialistRun,
  type ModelFinding,
  type SpecialistRunResult,
} from './_base';

const AGENT_KIND = 'security' as const;
const AGENT_VERSION = 'claude-sonnet-4-6@security-v1';
const MODEL = 'claude-sonnet-4-6';

// ============================================================
// System prompt
// ============================================================

const SYSTEM_PROMPT = `You are the SECURITY specialist agent for ATLANTIS — an agentic dApp discovery layer on the Sui blockchain.

Your job: evaluate one Sui Move dApp's smart contracts for security risk and produce a structured report.

PROCESS
1. Use \`get_move_modules\` to read the dApp's contracts.
2. Use \`get_object\` to inspect any capabilities, upgrade caps, or treasury caps you find.
3. Use \`recent_package_txs\` to look at recent on-chain activity for suspicious patterns.
4. Use \`observe\` to drop short intermediate notes into the shared scratchpad as you work — other specialists in the same round can read them, and so can the summarizer.
5. When done, call \`submit_finding\` exactly once with your full structured report. After that call, the run ends.

RED FLAGS TO LOOK FOR
- Admin / authority functions that are entry-callable without a capability witness as a parameter.
- Mintable currencies or coins whose mint function is reachable without a TreasuryCap-style gate, or with no upper-bound supply check.
- Upgrade capability (UpgradeCap) held by a plain address rather than burned, frozen, or held in a multisig/timelock.
- Authority/ownership transfer entry points reachable by any caller.
- Public entry functions that mutate admin-restricted state without checking sender or capability.
- Suspicious tx patterns: rapid sequential admin calls, recent ownership transfers from the deployer, abnormal mint events.

DO NOT
- Hallucinate function names. Only cite functions / modules / objects you actually retrieved via tools.
- Speculate without evidence — prefer a lower confidence over a fabricated finding.
- Call submit_finding before you've actually inspected the package.

VERDICT RUBRIC
- green  (score 80-100): no significant findings; package follows Move best practices.
- yellow (score 50-79):  minor issues, unconfirmed concerns, or limited evidence.
- red    (score 0-49):   confirmed high or critical findings (active rug vectors, reachable admin without gates, etc.).

CONFIDENCE
A number 0..1 reflecting how confident you are in the verdict given the evidence you gathered. If the package was unreadable or the dApp doesn't have a smart contract, return verdict=yellow with confidence<=0.2 and one info-level finding explaining why.

KEEP FINDINGS CONCRETE
Each finding must have: severity, title, one-paragraph detail, and evidence (packageId/line/note when applicable). Recommendations should be actionable in one sentence each.`;

// ============================================================
// Main entry
// ============================================================

export async function runSecuritySpecialist(
  input: SpecialistInput
): Promise<SpecialistRunResult> {
  // Short-circuit when there's literally nothing to audit.
  if (!input.packageId) {
    return finalizeSpecialistRun({
      input,
      agentKind: AGENT_KIND,
      agentVersion: AGENT_VERSION,
      model: MODEL,
      modelOutput: {
        verdict: 'yellow',
        score: 50,
        confidence: 0.05,
        findings: [
          {
            severity: 'info',
            title: 'No smart-contract package linked to this dApp',
            detail:
              'The dApp registration did not include a `package_id`. Security analysis requires a Move package to inspect, so no audit was performed.',
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
    tools: [...suiQueryTools, ...memwalTools, submitFindingTool(SUBMIT_FINDING_SCHEMA)],
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

// ============================================================
// Helpers
// ============================================================

function buildUserMessage(input: SpecialistInput): string {
  const meta = input.metadata;
  return [
    `Evaluate this dApp for security risk.`,
    ``,
    `dApp:        ${meta.name}`,
    `tagline:     ${meta.tagline}`,
    `category:    ${meta.category}`,
    `website:     ${meta.website}`,
    meta.github ? `github:      ${meta.github}` : '',
    meta.twitter ? `twitter:     ${meta.twitter}` : '',
    `dapp id:     ${input.dappId}`,
    `package id:  ${input.packageId}`,
    `round id:    ${input.roundId}`,
    ``,
    `Start by reading the Move modules with get_move_modules. Use observe() to drop notes as you work. Call submit_finding once when you're done.`,
  ]
    .filter(Boolean)
    .join('\n');
}
