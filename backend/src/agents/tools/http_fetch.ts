/**
 * HTTP fetch tool for the UX specialist.
 *
 * Used to read a dApp's website + README + docs. Strict caps so we
 * don't blow the model's context with a megabyte HTML page:
 *
 *   - 200 KB max response size
 *   - 8 second timeout
 *   - HTML is roughly tag-stripped before being returned (we want the
 *     text the model would reason about, not <script>/<style> bloat)
 *   - GET-only
 *   - Only http: / https: URLs allowed
 */

import type { ToolDefinition } from '../runtime/types';

const MAX_BYTES = 200_000;
const TIMEOUT_MS = 8_000;

interface HttpFetchInput {
  url: string;
  /** "auto" (default), "raw", or "stripped". */
  mode?: 'auto' | 'raw' | 'stripped';
}

interface HttpFetchOutput {
  url: string;
  status: number | null;
  contentType: string | null;
  bytes: number;
  truncated: boolean;
  body: string;
  error?: string;
}

export const httpFetchTool: ToolDefinition<HttpFetchInput, string> = {
  name: 'http_fetch',
  description:
    'GET a public URL and return the response body. Use this to read a dApp\'s landing page, docs page, GitHub README, etc. HTML is stripped of <script> + <style> + tag noise by default. Response is capped at 200KB and 8s timeout.',
  input_schema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'Absolute http(s) URL.',
      },
      mode: {
        type: 'string',
        enum: ['auto', 'raw', 'stripped'],
        description:
          'auto (default): strip HTML automatically when content-type is text/html. raw: return body as-is. stripped: always strip HTML tags.',
      },
    },
    required: ['url'],
  },
  async execute({ url, mode = 'auto' }) {
    const result: HttpFetchOutput = {
      url,
      status: null,
      contentType: null,
      bytes: 0,
      truncated: false,
      body: '',
    };

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      result.error = 'Invalid URL';
      return JSON.stringify(result);
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      result.error = `Disallowed protocol: ${parsed.protocol}`;
      return JSON.stringify(result);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'user-agent': 'ATLANTIS-agent/0.1' },
      });
      result.status = res.status;
      result.contentType = res.headers.get('content-type');

      const reader = res.body?.getReader();
      if (!reader) {
        result.error = 'No response body';
        return JSON.stringify(result);
      }

      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          total += value.byteLength;
          if (total > MAX_BYTES) {
            result.truncated = true;
            chunks.push(value.subarray(0, value.byteLength - (total - MAX_BYTES)));
            try {
              await reader.cancel();
            } catch {
              /* noop */
            }
            break;
          }
          chunks.push(value);
        }
      }
      result.bytes = Math.min(total, MAX_BYTES);

      const decoder = new TextDecoder('utf-8', { fatal: false });
      const merged = mergeChunks(chunks);
      let body = decoder.decode(merged);

      const isHtml =
        (result.contentType ?? '').toLowerCase().includes('text/html') ||
        body.trimStart().startsWith('<');
      if (mode === 'stripped' || (mode === 'auto' && isHtml)) {
        body = stripHtml(body);
      }
      result.body = body;
      return JSON.stringify(result);
    } catch (err) {
      result.error =
        (err as Error)?.name === 'AbortError'
          ? `Timed out after ${TIMEOUT_MS}ms`
          : err instanceof Error
            ? err.message
            : String(err);
      return JSON.stringify(result);
    } finally {
      clearTimeout(timer);
    }
  },
};

function mergeChunks(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.byteLength, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
