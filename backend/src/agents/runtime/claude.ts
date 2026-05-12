/**
 * Anthropic tool-use loop for ATLANTIS agents.
 *
 * Wraps the Anthropic SDK's Messages API with:
 *   - structured tool dispatch via a Map<name, ToolDefinition>
 *   - hard caps on turns and tokens
 *   - prompt caching on system prompt + tool definitions
 *   - structured ModelTrace returned on every run
 *
 * Specialists call this with their own system prompt and tool set.
 * They terminate by calling a `submit_finding` tool whose input is the
 * SpecialistOutput. That tool's executor stashes the parsed output,
 * and the loop ends.
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  ModelTrace,
  RunInput,
  RunResult,
  ToolDefinition,
} from './types';

const DEFAULT_MAX_TURNS = 12;
const DEFAULT_MAX_TOKENS = 40_000;
const PER_RESPONSE_MAX_TOKENS = 4_096;

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Add it to backend/.env — see .env.example.'
    );
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

/**
 * Run an agent to completion. Returns a RunResult.
 *
 * Conventions:
 *   - The agent submits its structured output by calling a tool named
 *     `submit_finding` (or whatever name its specialist defines as
 *     `terminal: true` — see below). When the loop sees a terminal tool
 *     call, it captures `result.output` and stops.
 *   - If `maxTurns` is hit without a terminal tool call, returns with
 *     `stopReason: 'turn_cap'` and `output: null`.
 *   - If estimated total tokens exceed `maxTokens`, same with 'token_cap'.
 */
export async function runAgent<TOutput = unknown>(
  input: RunInput
): Promise<RunResult<TOutput>> {
  const maxTurns = input.caps?.maxTurns ?? DEFAULT_MAX_TURNS;
  const maxTokens = input.caps?.maxTokens ?? DEFAULT_MAX_TOKENS;

  const trace: ModelTrace = {
    model: input.model,
    turns: 0,
    tokensIn: 0,
    tokensOut: 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    startedAt: Date.now(),
    finishedAt: 0,
    reason: 'error',
  };

  // Index tools by name for dispatch.
  const toolMap = new Map<string, ToolDefinition>();
  for (const t of input.tools) toolMap.set(t.name, t);

  // A tool is "terminal" when its execute() throws a TerminalSignal
  // OR (convention) its name === 'submit_finding'. We catch that signal
  // to capture the structured output without unwinding the loop with an error.
  let capturedOutput: TOutput | null = null;
  let finalText = '';
  let lastError: Error | null = null;

  // Convert ToolDefinition[] into the Anthropic API's tool schema.
  const apiTools = input.tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema,
  }));

  // Message thread — we mutate this each turn.
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: input.userMessage },
  ];

  try {
    for (let turn = 0; turn < maxTurns; turn++) {
      trace.turns = turn + 1;

      const totalSoFar = trace.tokensIn + trace.tokensOut;
      if (totalSoFar > maxTokens) {
        trace.reason = 'token_cap';
        break;
      }

      const response = await client().messages.create({
        model: input.model,
        max_tokens: PER_RESPONSE_MAX_TOKENS,
        temperature: 0,
        // Cache the system prompt and tool definitions — they're stable
        // across turns within a run and often across runs of the same agent.
        system: [
          {
            type: 'text',
            text: input.system,
            cache_control: { type: 'ephemeral' },
          },
        ],
        tools: apiTools.length ? apiTools : undefined,
        messages,
      });

      // Accumulate usage. Anthropic returns cache_read/creation only when caching is in effect.
      trace.tokensIn += response.usage.input_tokens ?? 0;
      trace.tokensOut += response.usage.output_tokens ?? 0;
      const cacheRead = (response.usage as unknown as { cache_read_input_tokens?: number })
        .cache_read_input_tokens;
      const cacheCreate = (response.usage as unknown as { cache_creation_input_tokens?: number })
        .cache_creation_input_tokens;
      if (typeof cacheRead === 'number') trace.cacheReadTokens += cacheRead;
      if (typeof cacheCreate === 'number') trace.cacheCreationTokens += cacheCreate;

      // Capture any text the model produced this turn (may coexist with tool_use).
      for (const block of response.content) {
        if (block.type === 'text') finalText = block.text;
      }

      if (response.stop_reason !== 'tool_use') {
        // The model decided it's done without calling a terminal tool.
        trace.reason = response.stop_reason === 'stop_sequence' ? 'stop_sequence' : 'submitted';
        // Append the assistant message so the thread is complete (for callers who want it).
        messages.push({ role: 'assistant', content: response.content });
        break;
      }

      // Execute every tool_use block this turn, accumulate tool_result blocks.
      messages.push({ role: 'assistant', content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;

        const def = toolMap.get(block.name);
        if (!def) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: `Unknown tool: ${block.name}`,
            is_error: true,
          });
          continue;
        }

        try {
          const result = await def.execute(block.input);

          // Convention: a tool named `submit_finding` terminates the loop
          // and its input *is* the structured output the caller wants.
          if (block.name === 'submit_finding') {
            capturedOutput = block.input as TOutput;
            trace.reason = 'submitted';
            // Echo a benign tool_result so the assistant turn is well-formed,
            // but we won't loop again.
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: 'OK — finding recorded.',
            });
            messages.push({ role: 'user', content: toolResults });
            // Break out of the turn loop by setting a sentinel.
            return finalize();
          }

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: typeof result === 'string' ? result : JSON.stringify(result),
          });
        } catch (err) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: err instanceof Error ? err.message : String(err),
            is_error: true,
          });
        }
      }

      messages.push({ role: 'user', content: toolResults });
    }

    if (trace.reason === 'error') {
      // Loop ended by hitting maxTurns without break.
      trace.reason = 'turn_cap';
    }
  } catch (err) {
    lastError = err instanceof Error ? err : new Error(String(err));
    trace.reason = 'error';
  }

  return finalize();

  // Inline helper so we can return from inside the loop with consistent shape.
  function finalize(): RunResult<TOutput> {
    trace.finishedAt = Date.now();
    return {
      output: capturedOutput,
      finalText,
      trace,
      stopReason: trace.reason,
      error: lastError,
    };
  }
}

/**
 * Convenience for the `submit_finding` tool every specialist registers.
 * The schema parameter is the JSON Schema for SpecialistOutput
 * (or whatever the specific specialist's output shape is).
 */
export function submitFindingTool(
  inputSchema: ToolDefinition['input_schema']
): ToolDefinition {
  return {
    name: 'submit_finding',
    description:
      'Call this exactly once at the end of your run to submit your final structured finding. After this call the run ends.',
    input_schema: inputSchema,
    execute: async () => 'OK',
  };
}
