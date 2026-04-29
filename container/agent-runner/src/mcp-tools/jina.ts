const JINA_READER_BASE = 'https://r.jina.ai/';

function log(msg: string): void {
  console.error(`[jina] ${msg}`);
}

/**
 * Try extracting page content via Jina Reader (r.jina.ai).
 * Returns extracted text or null on any failure. Designed as a fallback
 * when Readability extraction produces too little content.
 */
export async function tryJinaExtract(
  url: string,
  maxChars: number,
  minLength?: number,
): Promise<string | null> {
  if (process.env.JINA_READER_ENABLED === 'false') return null;

  try {
    const jinaUrl = `${JINA_READER_BASE}${url}`;
    const headers: Record<string, string> = { Accept: 'text/plain' };
    const apiKey = process.env.JINA_API_KEY;
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const resp = await fetch(jinaUrl, { headers, signal: AbortSignal.timeout(15_000) });
    if (!resp.ok) {
      log(`Jina returned ${resp.status} for ${url}`);
      return null;
    }

    let text = await resp.text();
    if (text.length > maxChars) {
      text = text.slice(0, maxChars) + '\n\n[Truncated]';
    }

    if (minLength && text.length <= minLength) {
      log(`Jina result (${text.length} chars) not better than existing (${minLength} chars)`);
      return null;
    }

    log(`Jina extracted ${text.length} chars for ${url}`);
    return text;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Jina extraction failed for ${url}: ${msg}`);
    return null;
  }
}
