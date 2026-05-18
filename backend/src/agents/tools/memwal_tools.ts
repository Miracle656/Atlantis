/**
 * MemWal-backed tools for cross-agent memory.
 *
 * Specialists `observe` to drop notes into the round's shared scratchpad
 * so the summarizer (and other specialists in the same round) can read
 * them later. `recall_observations` searches that same namespace.
 *
 * Both tools are bound to a specific scratch namespace at construction
 * time so the agent can't write into the wrong round by accident.
 */

import type { ToolDefinition } from '../runtime/types';
import { remember, recall, evalNamespace } from '../runtime/memwal';

interface ObserveInput {
  note: string;
}

interface RecallInput {
  query: string;
  limit?: number;
}

/**
 * Build the observe + recall pair scoped to one evaluation round.
 * Pass the resulting tools to runAgent for any specialist in that round.
 */
export function memwalToolsForRound(
  roundId: number | string
): ToolDefinition<any, any>[] {
  const ns = evalNamespace(roundId);

  const observe: ToolDefinition<ObserveInput, string> = {
    name: 'observe',
    description:
      'Record a short observation into this round\'s shared scratchpad. Other specialists and the summarizer can later recall it. Use this for intermediate findings, hypotheses, or evidence pointers — not your final verdict (use submit_finding for that).',
    input_schema: {
      type: 'object',
      properties: {
        note: {
          type: 'string',
          description:
            'A single complete sentence stating what you observed. Include concrete identifiers (function names, tx digests, object ids) when relevant.',
        },
      },
      required: ['note'],
    },
    async execute({ note }) {
      await remember(note, ns);
      return 'OK — observation stored.';
    },
  };

  const recallObservations: ToolDefinition<RecallInput, string> = {
    name: 'recall_observations',
    description:
      'Semantic search across observations recorded by any specialist in this round. Returns the most relevant notes for your query.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'What you want to know (e.g., "did anyone find admin caps?").',
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 20,
          description: 'Max results (default 5).',
        },
      },
      required: ['query'],
    },
    async execute({ query, limit }) {
      const res = await recall(query, ns, limit ?? 5);
      if (!res.results.length) return 'No observations found yet for this round.';
      return JSON.stringify(
        res.results.map((r: { text: string; distance: number }) => ({
          text: r.text,
          distance: r.distance,
        })),
        null,
        2
      );
    },
  };

  return [observe, recallObservations];
}
