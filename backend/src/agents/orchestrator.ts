/**
 * Evaluation round orchestrator.
 *
 * One call → four specialists → summarizer → 5 on-chain AgentReports.
 *
 * Triggered today by:
 *   - POST /api/agents/eval/:dappId (manual / frontend)
 *
 * Future triggers (issue #13 extensions):
 *   - DAppRegistered event subscription from mamiwaterc::dapp_registry
 *   - Daily cron sweep of the top-20 most-viewed dApps
 *
 * Concurrency control: an in-memory Set of in-flight dappIds prevents
 * the same dApp being evaluated twice in parallel. Good enough for a
 * single-instance Render deploy. Move to Redis when we scale out.
 */

import { runSecuritySpecialist } from './specialists/security';
import { runTokenomicsSpecialist } from './specialists/tokenomics';
import { runUxSpecialist } from './specialists/ux';
import { runMetricsSpecialist } from './specialists/metrics';
import { runSummarizer } from './summarizer';
import type {
  AgentKind,
  SpecialistInput,
  SpecialistOutput,
} from './runtime/types';
import { evalNamespace } from './runtime/memwal';
import type { SpecialistRunResult } from './specialists/_base';
import { abortedFinding, emptyTrace } from './specialists/_base';

// ============================================================
// Public types
// ============================================================

export interface DAppMeta {
  name: string;
  tagline: string;
  category: string;
  website: string;
  twitter?: string;
  github?: string;
  discord?: string;
}

export interface EvalRoundInput {
  dappId: string;
  packageId?: string;
  metadata: DAppMeta;
  /** Defaults to Date.now(). Set explicitly when replaying. */
  roundId?: number;
  /** Run specialists concurrently. Default false. */
  parallel?: boolean;
}

export interface SpecialistOutcome {
  agent: AgentKind;
  ok: boolean;
  result?: SpecialistRunResult;
  error?: string;
}

export interface EvalRoundResult {
  dappId: string;
  roundId: number;
  startedAt: number;
  finishedAt: number;
  specialists: SpecialistOutcome[];
  /** Populated when at least one specialist finished. */
  summary?: SpecialistRunResult;
  /** True iff every specialist + summarizer published on-chain. */
  fullySuccessful: boolean;
}

// ============================================================
// Concurrency control
// ============================================================

const inFlight = new Set<string>();

export function isEvalInFlight(dappId: string): boolean {
  return inFlight.has(dappId);
}

// ============================================================
// Specialist registry
// ============================================================

type SpecialistRunner = (input: SpecialistInput) => Promise<SpecialistRunResult>;

const SPECIALISTS: Array<{ kind: AgentKind; run: SpecialistRunner }> = [
  { kind: 'security', run: runSecuritySpecialist },
  { kind: 'tokenomics', run: runTokenomicsSpecialist },
  { kind: 'ux', run: runUxSpecialist },
  { kind: 'metrics', run: runMetricsSpecialist },
];

// ============================================================
// Main entry
// ============================================================

export async function runEvaluationRound(
  input: EvalRoundInput
): Promise<EvalRoundResult> {
  const dappId = input.dappId;
  if (inFlight.has(dappId)) {
    throw new EvalAlreadyRunningError(dappId);
  }
  inFlight.add(dappId);

  const roundId = input.roundId ?? Date.now();
  const startedAt = Date.now();

  const specialistInput: SpecialistInput = {
    dappId,
    packageId: input.packageId,
    metadata: input.metadata,
    roundId,
    scratchNamespace: evalNamespace(roundId),
  };

  try {
    const outcomes = input.parallel
      ? await runSpecialistsParallel(specialistInput)
      : await runSpecialistsSequential(specialistInput);

    const successfulOutputs = outcomes
      .filter((o) => o.ok && o.result)
      .map((o) => o.result!.output);

    let summary: SpecialistRunResult | undefined;
    let summarizerFailed = false;
    try {
      summary = await runSummarizer({
        ...specialistInput,
        specialistOutputs: successfulOutputs,
      });
    } catch (err) {
      summarizerFailed = true;
      console.error(`[orchestrator] summarizer failed for ${dappId}:`, err);
    }

    return {
      dappId,
      roundId,
      startedAt,
      finishedAt: Date.now(),
      specialists: outcomes,
      summary,
      fullySuccessful:
        !summarizerFailed && outcomes.every((o) => o.ok) && !!summary,
    };
  } finally {
    inFlight.delete(dappId);
  }
}

// ============================================================
// Specialist runners
// ============================================================

async function runSpecialistsSequential(
  input: SpecialistInput
): Promise<SpecialistOutcome[]> {
  const out: SpecialistOutcome[] = [];
  for (const spec of SPECIALISTS) {
    out.push(await runOne(spec, input));
  }
  return out;
}

async function runSpecialistsParallel(
  input: SpecialistInput
): Promise<SpecialistOutcome[]> {
  return Promise.all(SPECIALISTS.map((spec) => runOne(spec, input)));
}

async function runOne(
  spec: { kind: AgentKind; run: SpecialistRunner },
  input: SpecialistInput
): Promise<SpecialistOutcome> {
  try {
    const result = await spec.run(input);
    return { agent: spec.kind, ok: true, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[orchestrator] specialist ${spec.kind} failed for ${input.dappId}:`,
      err
    );
    // Build a synthetic failed output so the summarizer can still proceed
    // and the audit trail records something for this specialist.
    const fakeFinding = abortedFinding(`Specialist crashed: ${message}`);
    return {
      agent: spec.kind,
      ok: false,
      error: message,
      result: {
        output: {
          agent: spec.kind,
          version: `${spec.kind}@orchestrator-fallback-v1`,
          dappId: input.dappId,
          roundId: input.roundId,
          verdict: fakeFinding.verdict,
          score: fakeFinding.score,
          confidence: fakeFinding.confidence,
          findings: fakeFinding.findings,
          recommendations: fakeFinding.recommendations,
          generatedAt: Date.now(),
          modelTrace: emptyTrace('n/a'),
        },
        walrusBlobId: '',
        onChain: { digest: '', reportId: '' },
      },
    };
  }
}

// ============================================================
// Errors
// ============================================================

export class EvalAlreadyRunningError extends Error {
  constructor(public dappId: string) {
    super(`Evaluation already in flight for dapp ${dappId}`);
    this.name = 'EvalAlreadyRunningError';
  }
}

// Convenience: extract a flat output array for callers that just want
// "what did the specialists say?" without the success/error wrapper.
export function specialistOutputsFrom(
  result: EvalRoundResult
): SpecialistOutput[] {
  return result.specialists
    .map((s) => s.result?.output)
    .filter((o): o is SpecialistOutput => !!o);
}
