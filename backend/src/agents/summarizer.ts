/**
 * Summarizer agent for ATLANTIS.
 *
 * Takes the four specialist SpecialistOutputs for one (dappId, roundId)
 * and fuses them into a consensus report:
 *
 *   - The verdict and score are **deterministic** (rule + weighted mean)
 *     so consumers can trust them. The LLM cannot fabricate a green.
 *   - The LLM's job is **synthesis**: dedup findings, pick the top
 *     5-7 by severity, distill recommendations to 3-5 actionable ones,
 *     and write a short paragraph explaining the consensus.
 *
 * The output is published on-chain with `agent_kind: "summary"` —
 * which makes the agent_reports module index it into `latest_summary`
 * automatically, so the frontend can always fetch "the one report
 * users see" per dApp with O(1) lookup.
 */

import { runAgent, submitFindingTool } from './runtime/claude';
import { memwalToolsForRound } from './tools/memwal_tools';
import type {
  Finding,
  SpecialistInput,
  SpecialistOutput,
  Verdict,
} from './runtime/types';
import {
  SUBMIT_FINDING_SCHEMA,
  abortedFinding,
  finalizeSpecialistRun,
  type ModelFinding,
  type SpecialistRunResult,
} from './specialists/_base';

const AGENT_KIND = 'summary' as const;
const AGENT_VERSION = 'claude-opus-4-7@summarizer-v1';
const MODEL = 'claude-opus-4-7'; // synthesis quality matters more here

// Weighted score: security carries the most because it's the only
// dimension where a single critical finding should drag the consensus.
const WEIGHTS = {
  security: 0.35,
  tokenomics: 0.25,
  ux: 0.20,
  metrics: 0.20,
} as const;

// ============================================================
// Deterministic composite verdict + score
// ============================================================

/**
 * Compose a verdict from the specialist verdicts.
 *   - any red → red
 *   - >= 2 yellow → yellow
 *   - exactly 1 yellow and 3 green → yellow (one weak dimension still warrants caution)
 *   - all green → green
 */
export function composeVerdict(outputs: SpecialistOutput[]): Verdict {
  const verdicts = outputs.map((o) => o.verdict);
  if (verdicts.includes('red')) return 'red';
  const yellowCount = verdicts.filter((v) => v === 'yellow').length;
  if (yellowCount >= 1) return 'yellow';
  return 'green';
}

/**
 * Weighted mean of specialist scores. Falls back to a straight mean
 * for unknown agent kinds. Returns 0..100.
 */
export function composeScore(outputs: SpecialistOutput[]): number {
  if (!outputs.length) return 0;

  let weightSum = 0;
  let weighted = 0;
  let unweightedSum = 0;

  for (const o of outputs) {
    const w = (WEIGHTS as Record<string, number>)[o.agent] ?? 0;
    if (w > 0) {
      weighted += o.score * w;
      weightSum += w;
    }
    unweightedSum += o.score;
  }

  const score =
    weightSum > 0 ? weighted / weightSum : unweightedSum / outputs.length;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Mean confidence across the specialists who produced output. */
export function composeConfidence(outputs: SpecialistOutput[]): number {
  if (!outputs.length) return 0;
  const sum = outputs.reduce((s, o) => s + o.confidence, 0);
  return Math.max(0, Math.min(1, sum / outputs.length));
}

// ============================================================
// Main entry
// ============================================================

export interface SummarizerInput extends SpecialistInput {
  specialistOutputs: SpecialistOutput[];
}

export async function runSummarizer(
  input: SummarizerInput
): Promise<SpecialistRunResult> {
  // Deterministic baseline — never overridden by the LLM.
  const baselineVerdict = composeVerdict(input.specialistOutputs);
  const baselineScore = composeScore(input.specialistOutputs);
  const baselineConfidence = composeConfidence(input.specialistOutputs);

  // If no specialists ran, we can't summarize. Publish a yellow stub.
  if (!input.specialistOutputs.length) {
    return finalizeSpecialistRun({
      input,
      agentKind: AGENT_KIND,
      agentVersion: AGENT_VERSION,
      model: MODEL,
      modelOutput: {
        verdict: 'yellow',
        score: 50,
        confidence: 0,
        findings: [
          {
            severity: 'info',
            title: 'No specialist reports available for this round',
            detail:
              'The summarizer was invoked without any specialist outputs to fuse. Re-run the evaluator round.',
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
    userMessage: buildUserMessage(input, baselineVerdict, baselineScore),
    model: MODEL,
    tools: [...memwalTools, submitFindingTool(SUBMIT_FINDING_SCHEMA)],
    caps: { maxTurns: 6, maxTokens: 30_000 }, // synthesis-only, fewer turns
    metadata: { dappId: input.dappId, roundId: input.roundId, agent: AGENT_KIND },
  });

  const llmOutput =
    run.output ??
    abortedFinding(`Stop reason: ${run.stopReason}. ${run.error?.message ?? ''}`.trim());

  // Override the LLM's verdict + score + confidence with the deterministic ones.
  // The LLM's contribution is the synthesized findings + recommendations.
  const finalOutput: ModelFinding = {
    verdict: baselineVerdict,
    score: baselineScore,
    confidence: baselineConfidence,
    findings: dedupAndCap(llmOutput.findings, 7),
    recommendations: capList(llmOutput.recommendations, 5),
  };

  return finalizeSpecialistRun({
    input,
    agentKind: AGENT_KIND,
    agentVersion: AGENT_VERSION,
    model: MODEL,
    modelOutput: finalOutput,
    trace: run.trace,
  });
}

// ============================================================
// System prompt + user message
// ============================================================

const SYSTEM_PROMPT = `You are the SUMMARIZER agent for ATLANTIS.

You receive 1-4 specialist reports about a single Sui dApp. Your job is to fuse them into one user-facing report.

CONSTRAINTS
- You do NOT decide the verdict or score. Those are computed deterministically by ATLANTIS from the specialist verdicts and scores using fixed rules. You will see the baseline values in the user message — fill those same values into your submit_finding call.
- Your synthesis job:
  1. **Findings**: pick the 5-7 most important findings across all specialists. Order by severity (critical → high → med → low → info). Deduplicate near-identical findings from different specialists. Quote specialists verbatim where possible — do not paraphrase a critical finding into something weaker. Each finding must keep its original \`evidence\` payload when the source specialist provided one.
  2. **Recommendations**: pick 3-5 actionable items, prioritized by impact. Combine recommendations that say the same thing.

CRITICAL RULES
- Do not invent findings or recommendations that no specialist produced.
- Do not soften a "critical" or "high" severity finding into something weaker.
- Cite the specialist by name in the finding's \`detail\` field when useful (e.g. "Security agent identified...").
- Use the \`recall_observations\` tool if you need extra context from the round's scratchpad.

Call \`submit_finding\` exactly once with: the baseline verdict + score + confidence (provided in the user message) and your synthesized findings + recommendations.`;

function buildUserMessage(
  input: SummarizerInput,
  baselineVerdict: Verdict,
  baselineScore: number
): string {
  const meta = input.metadata;
  const head = [
    `Synthesize the consensus report for this dApp.`,
    ``,
    `dApp:     ${meta.name}`,
    `category: ${meta.category}`,
    `dapp id:  ${input.dappId}`,
    `round id: ${input.roundId}`,
    ``,
    `Deterministic baseline (use these in submit_finding):`,
    `  verdict: ${baselineVerdict}`,
    `  score:   ${baselineScore}`,
    ``,
    `Specialist reports (${input.specialistOutputs.length}):`,
    ``,
  ].join('\n');

  const bodies = input.specialistOutputs
    .map((o, i) => {
      const findings = o.findings
        .map(
          (f, j) =>
            `    ${j + 1}. [${f.severity}] ${f.title} — ${f.detail.replace(/\s+/g, ' ').slice(0, 400)}`
        )
        .join('\n');
      const recs = o.recommendations.map((r, j) => `    ${j + 1}. ${r}`).join('\n');
      return [
        `--- ${i + 1}. ${o.agent.toUpperCase()} (${o.version}) ---`,
        `  verdict: ${o.verdict}    score: ${o.score}    confidence: ${o.confidence.toFixed(2)}`,
        ``,
        `  findings:`,
        findings || '    (none)',
        ``,
        `  recommendations:`,
        recs || '    (none)',
      ].join('\n');
    })
    .join('\n\n');

  return head + bodies;
}

// ============================================================
// Synthesis helpers
// ============================================================

const SEVERITY_RANK: Record<Finding['severity'], number> = {
  critical: 0,
  high: 1,
  med: 2,
  low: 3,
  info: 4,
};

function dedupAndCap(findings: Finding[], cap: number): Finding[] {
  if (!findings?.length) return [];
  // Stable dedup by lowercased title.
  const seen = new Set<string>();
  const unique = findings.filter((f) => {
    const key = f.title.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  unique.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
  return unique.slice(0, cap);
}

function capList(items: string[], cap: number): string[] {
  if (!items?.length) return [];
  return items.slice(0, cap);
}
