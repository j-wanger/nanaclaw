import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

const MOCK_SEARXNG_RESPONSE = {
  results: [
    { title: 'Result 1', url: 'https://example.com/1', content: 'Snippet for result one' },
    { title: 'Result 2', url: 'https://example.com/2', content: 'Snippet for result two' },
    { title: 'Result 3', url: 'https://example.com/3', content: 'Snippet for result three' },
    { title: 'Result 4', url: 'https://example.com/4', content: 'Snippet for result four' },
    { title: 'Result 5', url: 'https://example.com/5', content: 'Snippet for result five' },
  ],
};

let originalFetch: typeof globalThis.fetch;
let searchHandler: (args: Record<string, unknown>) => Promise<CallToolResult>;

beforeEach(async () => {
  originalFetch = globalThis.fetch;
  process.env.SEARXNG_URL = 'http://localhost:8888';

  // Fresh import each test to pick up env changes
  // We'll test the handler directly
  const mod = await import('./web-search.js');
  searchHandler = mod.searchHandler;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.SEARXNG_URL;
});

function mockFetch(body: unknown, status = 200) {
  globalThis.fetch = mock(() =>
    Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })),
  ) as typeof fetch;
}

function getText(result: CallToolResult): string {
  return (result.content[0] as { type: 'text'; text: string }).text;
}

describe('web_search', () => {
  it('returns normalized results from SearXNG JSON', async () => {
    mockFetch(MOCK_SEARXNG_RESPONSE);

    const result = await searchHandler({ query: 'test query' });
    const text = getText(result);
    const parsed = JSON.parse(text);

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(5);
    expect(parsed[0]).toEqual({
      title: 'Result 1',
      url: 'https://example.com/1',
      snippet: 'Snippet for result one',
    });
  });

  it('limits output with max_results parameter', async () => {
    mockFetch(MOCK_SEARXNG_RESPONSE);

    const result = await searchHandler({ query: 'test', max_results: 2 });
    const parsed = JSON.parse(getText(result));

    expect(parsed.length).toBe(2);
    expect(parsed[0].title).toBe('Result 1');
    expect(parsed[1].title).toBe('Result 2');
  });

  it('returns graceful error when SEARXNG_URL not configured', async () => {
    delete process.env.SEARXNG_URL;

    const result = await searchHandler({ query: 'test' });
    const text = getText(result);

    expect(text).toContain('not configured');
  });

  it('returns graceful error when SearXNG is unreachable', async () => {
    globalThis.fetch = mock(() => Promise.reject(new Error('Connection refused'))) as typeof fetch;

    const result = await searchHandler({ query: 'test' });
    const text = getText(result);

    expect(text).toContain('Error');
    expect(text).toContain('Connection refused');
  });

  it('returns error for empty query', async () => {
    mockFetch(MOCK_SEARXNG_RESPONSE);

    const result = await searchHandler({ query: '' });
    const text = getText(result);

    expect(text).toContain('required');
  });

  it('handles SearXNG returning empty results', async () => {
    mockFetch({ results: [] });

    const result = await searchHandler({ query: 'obscure query' });
    const parsed = JSON.parse(getText(result));

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(0);
  });

  it('handles non-200 response gracefully', async () => {
    mockFetch({ error: 'rate limited' }, 429);

    const result = await searchHandler({ query: 'test' });
    const text = getText(result);

    expect(text).toContain('Error');
  });
});
