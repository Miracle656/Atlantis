/**
 * Shared types for the ATLANTIS agent runtime.
 *
 * Every specialist conforms to the same SpecialistOutput shape so the
 * Summarizer can fuse them mechanically. Everything that lands on Walrus
 * or on-chain is one of these types.
 */

// ============================================================
// Verdict + agent identity
// ============================================================

export type Verdict = 'green' | 'yellow' | 'red';

export type AgentKind =
  | 'security'
  | 'tokenomics'
  | 'ux'
  | 'metrics'
  | 'summary'
  | 'personal';

/** Encoded for the on-chain `publish_report` call. */
export const VERDICT_CODE: Record<Verdict, 0 | 1 | 2> = {
  red: 0,
  yellow: 1,
  green: 2,
};

// ============================================================
// Tool-use loop
// ============================================================

/** JSON-Schema shape for an Anthropic tool. */
export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  /** Server-side executor for this tool. */
  execute: (input: TInput) => Promise<TOutput>;
}

export interface ModelTrace {
  model: string;
  turns: number;
  tokensIn: number;
  tokensOut: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  startedAt: number;
  finishedAt: number;
  reason: 'submitted' | 'turn_cap' | 'token_cap' | 'stop_sequence' | 'error';
}

export interface RunCaps {
  /** Maximum tool-use turns. Default: 12. */
  maxTurns?: number;
  /** Maximum total tokens (in + out, excluding cache reads). Default: 40_000. */
  maxTokens?: number;
}

export interface RunInput {
  /** Logical agent identifier — used for logging + agent_version on-chain. */
  agentKind: AgentKind;
  /** Version string like "claude-sonnet-4-6@security-v1". Used as agent_version. */
  agentVersion: string;
  /** System prompt. Cached. */
  system: string;
  /** Initial user message that kicks off the run. */
  userMessage: string;
  /**
   * Tools available to the agent. Heterogeneous by design — each tool has
   * its own input/output types — so this is `<any, any>`. The generic
   * `ToolDefinition<TInput,TOutput>` is contravariant in TInput, which
   * makes `ToolDefinition<Specific>` unassignable to `ToolDefinition<unknown>`.
   */
  tools: ToolDefinition<any, any>[];
  /** Model id. Sonnet for specialists, Opus for summarizer/personal. */
  model: 'claude-sonnet-4-6' | 'claude-opus-4-7' | string;
  caps?: RunCaps;
  /** Optional metadata threaded into structured logs. */
  metadata?: Record<string, unknown>;
}

export interface RunResult<T = unknown> {
  /** Parsed structured output from the agent's final tool call (`submit_finding` etc.). */
  output: T | null;
  /** The agent's final assistant text, if any. */
  finalText: string;
  trace: ModelTrace;
  /** Reason the loop stopped — same as trace.reason but at top level for ergonomics. */
  stopReason: ModelTrace['reason'];
  /** Any error encountered. Null if successful. */
  error: Error | null;
}

// ============================================================
// Specialist input / output schema
// ============================================================

export type Severity = 'info' | 'low' | 'med' | 'high' | 'critical';

export interface Evidence {
  txDigest?: string;
  blobId?: string;
  url?: string;
  packageId?: string;
  line?: number;
  note?: string;
}

export interface Finding {
  severity: Severity;
  title: string;
  detail: string;
  evidence?: Evidence;
}

/**
 * What every specialist returns — and what the summarizer consumes.
 * Persisted to Walrus as JSON. The on-chain AgentReport stores the
 * blob id of this object plus a quick-filter verdict + score.
 */
export interface SpecialistOutput {
  agent: AgentKind;
  version: string;
  dappId: string;
  roundId: number;
  verdict: Verdict;
  score: number; // 0..100
  confidence: number; // 0..1
  findings: Finding[];
  recommendations: string[];
  generatedAt: number;
  modelTrace: ModelTrace;
}

export interface SpecialistInput {
  dappId: string;
  packageId?: string;
  metadata: {
    name: string;
    tagline: string;
    category: string;
    website: string;
    twitter?: string;
    github?: string;
  };
  roundId: number;
  /** MemWal namespace where this round's evaluator scratchpad lives. */
  scratchNamespace: string;
}

// ============================================================
// On-chain publish helper input
// ============================================================

export interface PublishReportInput {
  dappId: string;
  agentKind: AgentKind;
  agentVersion: string;
  reportBlobId: string;
  memwalThread?: string;
  verdict: Verdict;
  score: number; // 0..100
  roundId: number;
}

export interface PublishReportResult {
  digest: string;
  reportId: string;
}
