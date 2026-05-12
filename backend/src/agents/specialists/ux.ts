/**
 * UX specialist agent for ATLANTIS.
 *
 * Fetches the dApp's website, optional GitHub README, and existing
 * on-chain reviews, and evaluates clarity, presence of docs, dead
 * links, accessibility hints, and review sentiment.
 *
 * Yellow with low confidence when the site is unreachable — never a
 * hard error, since one broken endpoint shouldn't poison the audit.
 */

import { runAgent, submitFindingTool } from '../runtime/claude';
import { httpFetchTool } from '../tools/http_fetch';
import { memwalToolsForRound } from '../tools/memwal_tools';
import type { SpecialistInput } from '../runtime/types';
import {
  SUBMIT_FINDING_SCHEMA,
  abortedFinding,
  finalizeSpecialistRun,
  type ModelFinding,
  type SpecialistRunResult,
} from './_base';

const AGENT_KIND = 'ux' as const;
const AGENT_VERSION = 'claude-sonnet-4-6@ux-v1';
const MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `You are the UX specialist agent for ATLANTIS.

Your job: evaluate the user experience of a Sui dApp from a prospective user's perspective.

PROCESS
1. Use \`http_fetch\` to read the dApp's landing page. Look at the value proposition above the fold, clarity of CTA, presence of testimonials or social proof.
2. If a github url is provided, \`http_fetch\` the repo's README at the raw URL (e.g. \`https://raw.githubusercontent.com/owner/repo/main/README.md\`).
3. \`http_fetch\` any docs URL you find linked from the landing page.
4. Use \`observe\` to share notes with other specialists in this round.
5. Call \`submit_finding\` exactly once when you're done.

WHAT GOOD LOOKS LIKE
- Single clear value proposition above the fold.
- Obvious primary CTA (Connect Wallet / Launch App).
- Visible docs link + working docs.
- Honest copy (no obvious scam phrasing — "guaranteed 10x", "limited spots", etc.).
- Working internal links.

RED FLAGS
- Site unreachable or 4xx/5xx.
- No clear description of what the product does on the landing page.
- Broken or missing docs.
- Scammy copy.
- Wallet connect button leading to a different/spoofed dApp.

WHEN THE SITE IS UNREACHABLE
Return verdict=yellow, score 45-55, confidence 0.15-0.3, with one finding noting the failure mode (timeout / 4xx / 5xx). Don't speculate about UX you couldn't see.

VERDICT RUBRIC
- green  (score 80-100): clear, working, honest UX. Docs present.
- yellow (score 50-79):  partial — works but unclear copy, missing docs, or one broken thing.
- red    (score 0-49):   broken, scammy, or unreachable.

CONFIDENCE
0..1. Only cite what you actually fetched. Don't claim "the docs say X" if you didn't read them.`;

export async function runUxSpecialist(
  input: SpecialistInput
): Promise<SpecialistRunResult> {
  if (!input.metadata.website) {
    return finalizeSpecialistRun({
      input,
      agentKind: AGENT_KIND,
      agentVersion: AGENT_VERSION,
      model: MODEL,
      modelOutput: {
        verdict: 'yellow',
        score: 45,
        confidence: 0.15,
        findings: [
          {
            severity: 'low',
            title: 'No website registered for this dApp',
            detail:
              'The dApp registration did not include a website URL, so the UX agent had nothing to evaluate. Discoverability suffers without a public landing page.',
          },
        ],
        recommendations: [
          'Ask the dApp developer to add a public website URL to the registry entry.',
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
    tools: [httpFetchTool, ...memwalTools, submitFindingTool(SUBMIT_FINDING_SCHEMA)],
    caps: { maxTurns: 10, maxTokens: 50_000 }, // more tokens — pages are big
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
    `Evaluate this dApp's user experience.`,
    ``,
    `dApp:        ${meta.name}`,
    `tagline:     ${meta.tagline}`,
    `category:    ${meta.category}`,
    `website:     ${meta.website}`,
    meta.github ? `github:      ${meta.github}` : '',
    meta.twitter ? `twitter:     ${meta.twitter}` : '',
    `dapp id:     ${input.dappId}`,
    `round id:    ${input.roundId}`,
    ``,
    `Start by fetching the website. If a github url is given, try the README. Use observe() to share notes. Call submit_finding once.`,
  ]
    .filter(Boolean)
    .join('\n');
}
