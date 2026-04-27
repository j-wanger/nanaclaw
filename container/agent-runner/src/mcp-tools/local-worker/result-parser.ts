import type { OutputFormat } from './contract.js';

export interface ParseSuccess {
  ok: true;
  parsed: string;
}

export interface ParseError {
  ok: false;
  error: string;
  raw: string;
}

export type ParseResult = ParseSuccess | ParseError;

const FENCE_RE = /^```[^\n]*\n([\s\S]*?)\n```\s*$/;

function stripFences(text: string): string {
  const match = text.trim().match(FENCE_RE);
  return match ? match[1] : text;
}

export function parseWorkerResult(raw: string, format: OutputFormat): ParseResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: 'Worker returned empty response', raw };
  }

  const stripped = stripFences(trimmed);

  if (format === 'json') {
    try {
      JSON.parse(stripped);
    } catch (e) {
      return { ok: false, error: `Invalid JSON: ${(e as Error).message}`, raw };
    }
    return { ok: true, parsed: stripped };
  }

  if (format === 'code') {
    return { ok: true, parsed: stripped };
  }

  return { ok: true, parsed: trimmed };
}
