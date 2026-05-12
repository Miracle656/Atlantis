/**
 * Shared scaffolding for all specialist agents.
 *
 * Each specialist supplies its own system prompt, tool set, and
 * agent identity; the post-run "write to Walrus + publish on-chain"
 * sequence is identical, and lives here.
 */

import { writeJson } from '../runtime/walrus';
import { publishReport } from '../runtime/sui';
import type {
  AgentKind,
  Finding,
  ModelTrace,
  PublishReportResult,
  SpecialistInput,
  SpecialistOutput,
  Verdict,
} from '../runtime/types';

// ============================================================
// What the model fills in inside submit_finding's tool input.
// The runtime / _base adds agent / version / dappId / roundId /
// generatedAt / modelTrace before persisting.
// ============================================================

export type ModelFinding = {
  verdict: Verdict;
  score: number;
  confidence: number;
  findings: Finding[];
  recommendations: string[];
};

export const SUBMIT_FINDING_SCHEMA = {
  type: 'object' as const,
  properties: {
    verdict: { type: 'string', enum: ['green', 'yellow', 'red'] },
    score: { type: 'integer', minimum: 0, maximum: 100 },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['info', 'low', 'med', 'high', 'critical'] },
          title: { type: 'string' },
          detail: { type: 'string' },
          evidence: {
            type: 'object',
            properties: {
              txDigest: { type: 'string' },
              blobId: { type: 'string' },
              url: { type: 'string' },
              packageId: { type: 'string' },
              line: { type: 'integer' },
              note: { type: 'string' },
            },
          },
        },
        required: ['severity', 'title', 'detail'],
      },
    },
    recommendations: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['verdict', 'score', 'confidence', 'findings', 'recommendations'],
};

// ============================================================
// Specialist run result
// ============================================================

export interface SpecialistRunResult {
  output: SpecialistOutput;
  walrusBlobId: string;
  onChain: PublishReportResult;
}

export interface FinalizeArgs {
  input: SpecialistInput;
  modelOutput: ModelFinding;
  trace?: ModelTrace;
  agentKind: AgentKind;
  agentVersion: string;
  model: string;
}

/**
 * Take the model's structured finding, wrap it into a SpecialistOutput
 * with all runtime-managed fields filled in, persist it to Walrus, and
 * publish an on-chain AgentReport pointer.
 */
export async function finalizeSpecialistRun(
  args: FinalizeArgs
): Promise<SpecialistRunResult> {
  const { input, modelOutput, trace, agentKind, agentVersion, model } = args;

  const output: SpecialistOutput = {
    agent: agentKind,
    version: agentVersion,
    dappId: input.dappId,
    roundId: input.roundId,
    verdict: modelOutput.verdict,
    score: clampScore(modelOutput.score),
    confidence: clampUnit(modelOutput.confidence),
    findings: modelOutput.findings,
    recommendations: modelOutput.recommendations,
    generatedAt: Date.now(),
    modelTrace: trace ?? emptyTrace(model),
  };

  const walrusBlobId = await writeJson(output);

  const onChain = await publishReport({
    dappId: input.dappId,
    agentKind,
    agentVersion,
    reportBlobId: walrusBlobId,
    verdict: output.verdict,
    score: output.score,
    roundId: output.roundId,
  });

  return { output, walrusBlobId, onChain };
}

// ============================================================
// Small utilities
// ============================================================

export function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function clampUnit(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function emptyTrace(model: string): ModelTrace {
  const now = Date.now();
  return {
    model,
    turns: 0,
    tokensIn: 0,
    tokensOut: 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    startedAt: now,
    finishedAt: now,
    reason: 'error',
  };
}

/**
 * Build a verdict-yellow/confidence-0 finding for "this specialist did
 * not complete its run" — used by every specialist's failure path.
 */
export function abortedFinding(reason: string): ModelFinding {
  return {
    verdict: 'yellow',
    score: 50,
    confidence: 0,
    findings: [
      {
        severity: 'info',
        title: 'Specialist run did not complete',
        detail: reason,
      },
    ],
    recommendations: [
      'Re-run this specialist for the dApp once the upstream issue is resolved.',
    ],
  };
}
