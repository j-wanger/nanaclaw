import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

const MOCK_HTML = `<!DOCTYPE html>
<html><head><title>Test Article</title></head>
<body>
<header><nav>Menu items here</nav></header>
<article>
<h1>Test Article Title</h1>
<p>This is the first paragraph of the article with enough content to be considered readable by the readability algorithm. It needs to be substantial enough for extraction.</p>
<p>This is the second paragraph with more detailed information about the topic. The readability library requires a minimum amount of content to identify the article body correctly.</p>
<p>Third paragraph continues the discussion with additional supporting details. More text here to ensure readability picks this up as the main content of the page.</p>
<p>Fourth paragraph provides concluding remarks about the subject matter. This should be more than enough content for the extraction algorithm to work properly.</p>
</article>
<footer>Footer content</footer>
</body></html>`;

const MOCK_PLAIN_TEXT = 'This is plain text content, not HTML at all.';

let originalFetch: typeof globalThis.fetch;
let extractHandler: (args: Record<string, unknown>) => Promise<CallToolResult>;

beforeEach(async () => {
  originalFetch = globalThis.fetch;
  const mod = await import('./web-extract.js');
  extractHandler = mod.extractHandler;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function mockFetchHtml(body: string, contentType = 'text/html') {
  globalThis.fetch = mock(() =>
    Promise.resolve(new Response(body, { status: 200, headers: { 'content-type': contentType } })),
  ) as typeof fetch;
}

function getText(result: CallToolResult): string {
  return (result.content[0] as { type: 'text'; text: string }).text;
}

describe('web_extract', () => {
  it('returns markdown from HTML with title and body', async () => {
    mockFetchHtml(MOCK_HTML);

    const result = await extractHandler({ url: 'https://example.com/article' });
    const text = getText(result);

    expect(text).toContain('Test Article');
    expect(text).toContain('first paragraph');
    expect(text).toContain('second paragraph');
    expect(text).not.toContain('Menu items here');
  });

  it('truncates content at max_chars parameter', async () => {
    mockFetchHtml(MOCK_HTML);

    const result = await extractHandler({ url: 'https://example.com/article', max_chars: 100 });
    const text = getText(result);

    expect(text.length).toBeLessThanOrEqual(130); // small buffer for truncation message
  });

  it('returns graceful error on fetch failure', async () => {
    globalThis.fetch = mock(() => Promise.reject(new Error('DNS resolution failed'))) as typeof fetch;

    const result = await extractHandler({ url: 'https://nonexistent.example.com' });
    const text = getText(result);

    expect(text).toContain('Error');
    expect(text).toContain('DNS resolution failed');
  });

  it('returns raw text for non-HTML content type', async () => {
    mockFetchHtml(MOCK_PLAIN_TEXT, 'text/plain');

    const result = await extractHandler({ url: 'https://example.com/data.txt' });
    const text = getText(result);

    expect(text).toContain('plain text content');
  });

  it('returns error for empty url', async () => {
    const result = await extractHandler({ url: '' });
    const text = getText(result);

    expect(text).toContain('required');
  });

  it('handles non-200 response', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response('Not Found', { status: 404, headers: { 'content-type': 'text/html' } })),
    ) as typeof fetch;

    const result = await extractHandler({ url: 'https://example.com/missing' });
    const text = getText(result);

    expect(text).toContain('Error');
    expect(text).toContain('404');
  });
});
