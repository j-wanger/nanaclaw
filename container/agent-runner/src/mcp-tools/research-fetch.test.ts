import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

let tmpDir: string;
let wikisJsonPath: string;
let fetchHandler: (args: Record<string, unknown>) => Promise<CallToolResult>;
let originalFetch: typeof globalThis.fetch;

const MOCK_WIKIS = {
  version: 1,
  wikis: [
    { name: 'test-wiki', path: '', description: 'Test wiki for research' },
  ],
};

function getText(result: CallToolResult): string {
  return (result.content[0] as { type: 'text'; text: string }).text;
}

function getJson(result: CallToolResult): Record<string, unknown> {
  return JSON.parse(getText(result));
}

function makeSearxngResponse(results: { title: string; url: string; content: string }[]) {
  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

const FILLER = ' This is substantial content that provides real value to the reader. '.repeat(10);

function makeHtmlResponse(body: string) {
  return new Response(`<html><head><title>Test Page</title></head><body><article><p>${body}${FILLER}</p></article></body></html>`, {
    status: 200,
    headers: { 'content-type': 'text/html' },
  });
}

beforeEach(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'research-fetch-test-'));
  const wikiDir = path.join(tmpDir, 'test-wiki');
  fs.mkdirSync(path.join(wikiDir, 'raw', 'articles'), { recursive: true });
  MOCK_WIKIS.wikis[0].path = wikiDir;
  wikisJsonPath = path.join(tmpDir, 'wikis.json');
  fs.writeFileSync(wikisJsonPath, JSON.stringify(MOCK_WIKIS));

  process.env.WIKIS_JSON_PATH = wikisJsonPath;
  process.env.SEARXNG_URL = 'http://mock-searxng:8888';

  originalFetch = globalThis.fetch;

  const mod = await import('./research-fetch.js');
  fetchHandler = mod.fetchHandler;
});

afterEach(() => {
  delete process.env.WIKIS_JSON_PATH;
  delete process.env.SEARXNG_URL;
  globalThis.fetch = originalFetch;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('research_fetch', () => {
  it('returns raw article paths for new URLs from SearXNG', async () => {
    globalThis.fetch = mock(async (url: string | URL | Request) => {
      const u = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
      if (u.includes('mock-searxng')) {
        return makeSearxngResponse([
          { title: 'Page One', url: 'https://example.com/one', content: 'Snippet one' },
          { title: 'Page Two', url: 'https://example.com/two', content: 'Snippet two' },
        ]);
      }
      return makeHtmlResponse(`Content from ${u}`);
    }) as typeof fetch;

    const result = await fetchHandler({ query: 'test query' });
    const data = getJson(result);

    expect(data.added).toBe(2);
    expect(data.skipped).toBe(0);
    expect(data.new_articles).toBeInstanceOf(Array);
    expect((data.new_articles as { title: string; url: string }[]).length).toBe(2);
    expect((data.new_articles as { title: string; url: string }[])[0].title).toBe('Page One');
    expect((data.new_articles as { title: string; url: string }[])[0].url).toBe('https://example.com/one');
    // paths are NOT in the response — verify files exist on disk
    const rawDir = path.join(MOCK_WIKIS.wikis[0].path, 'raw', 'articles');
    const files = fs.readdirSync(rawDir);
    expect(files.length).toBe(2);
  });

  it('dedup skips URLs already in .url-index', async () => {
    const wikiDir = MOCK_WIKIS.wikis[0].path;
    const indexPath = path.join(wikiDir, 'raw', '.url-index');
    fs.writeFileSync(indexPath, 'https://example.com/existing\n');

    globalThis.fetch = mock(async (url: string | URL | Request) => {
      const u = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
      if (u.includes('mock-searxng')) {
        return makeSearxngResponse([
          { title: 'Existing', url: 'https://example.com/existing', content: 'Already indexed' },
          { title: 'New Page', url: 'https://example.com/new', content: 'Fresh content' },
        ]);
      }
      return makeHtmlResponse(`Content from ${u}`);
    }) as typeof fetch;

    const result = await fetchHandler({ query: 'test query' });
    const data = getJson(result);

    expect(data.added).toBe(1);
    expect(data.skipped).toBe(1);
  });

  it('handles partial failures gracefully via Promise.allSettled', async () => {
    globalThis.fetch = mock(async (url: string | URL | Request) => {
      const u = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
      if (u.includes('mock-searxng')) {
        return makeSearxngResponse([
          { title: 'Good Page', url: 'https://example.com/good', content: 'Works' },
          { title: 'Bad Page', url: 'https://example.com/bad', content: 'Fails' },
        ]);
      }
      if (u.includes('/bad')) {
        return new Response('Not Found', { status: 404 });
      }
      return makeHtmlResponse('Good content here');
    }) as typeof fetch;

    const result = await fetchHandler({ query: 'test query' });
    const data = getJson(result);

    expect(data.added).toBe(1);
    expect((data.failed as number) || 0).toBeGreaterThanOrEqual(1);
  });

  it('raw articles have correct Hermes frontmatter', async () => {
    globalThis.fetch = mock(async (url: string | URL | Request) => {
      const u = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
      if (u.includes('mock-searxng')) {
        return makeSearxngResponse([
          { title: 'Article', url: 'https://example.com/article', content: 'Test' },
        ]);
      }
      return makeHtmlResponse('Article body content for testing');
    }) as typeof fetch;

    const result = await fetchHandler({ query: 'test' });
    const data = getJson(result);
    expect(data.added).toBe(1);

    // paths are not in compact response — find the file on disk
    const rawDir = path.join(MOCK_WIKIS.wikis[0].path, 'raw', 'articles');
    const files = fs.readdirSync(rawDir).filter((f) => f.endsWith('.md'));
    const content = fs.readFileSync(path.join(rawDir, files[0]), 'utf8');

    expect(content).toMatch(/^---\n/);
    expect(content).toContain('source_url: https://example.com/article');
    expect(content).toContain('sha256:');
    expect(content).toContain('ingested:');
    expect(content).toContain('tier: raw');
  });

  it('.url-index updated with new URLs after fetch', async () => {
    globalThis.fetch = mock(async (url: string | URL | Request) => {
      const u = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
      if (u.includes('mock-searxng')) {
        return makeSearxngResponse([
          { title: 'Page', url: 'https://example.com/tracked', content: 'Test' },
        ]);
      }
      return makeHtmlResponse('Content');
    }) as typeof fetch;

    await fetchHandler({ query: 'test' });

    const indexPath = path.join(MOCK_WIKIS.wikis[0].path, 'raw', '.url-index');
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    expect(indexContent).toContain('https://example.com/tracked');
  });

  it('empty SearXNG results returns {articles: [], skipped: 0}', async () => {
    globalThis.fetch = mock(async () => {
      return makeSearxngResponse([]);
    }) as typeof fetch;

    const result = await fetchHandler({ query: 'nothing here' });
    const data = getJson(result);

    expect(data.new_articles).toEqual([]);
    expect(data.added).toBe(0);
    expect(data.skipped).toBe(0);
  });

  it('returns error when SEARXNG_URL not configured', async () => {
    delete process.env.SEARXNG_URL;

    const result = await fetchHandler({ query: 'test' });
    const text = getText(result);
    expect(text).toContain('Error');
    expect(text).toContain('SEARXNG_URL');
  });

  it('returns error when query is empty', async () => {
    const result = await fetchHandler({ query: '' });
    const text = getText(result);
    expect(text).toContain('Error');
  });

  it('respects wiki_name parameter for routing', async () => {
    // Add a second wiki
    const wiki2Dir = path.join(tmpDir, 'wiki-two');
    fs.mkdirSync(path.join(wiki2Dir, 'raw', 'articles'), { recursive: true });
    const wikis = {
      version: 1,
      wikis: [
        ...MOCK_WIKIS.wikis,
        { name: 'wiki-two', path: wiki2Dir, description: 'Second wiki' },
      ],
    };
    fs.writeFileSync(wikisJsonPath, JSON.stringify(wikis));

    globalThis.fetch = mock(async (url: string | URL | Request) => {
      const u = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
      if (u.includes('mock-searxng')) {
        return makeSearxngResponse([
          { title: 'Routed', url: 'https://example.com/routed', content: 'Test' },
        ]);
      }
      return makeHtmlResponse('Routed content');
    }) as typeof fetch;

    const result = await fetchHandler({ query: 'test', wiki_name: 'wiki-two' });
    const data = getJson(result);
    expect(data.added).toBe(1);

    // verify file landed in wiki-two, not the default wiki
    const wiki2RawDir = path.join(wiki2Dir, 'raw', 'articles');
    const files = fs.readdirSync(wiki2RawDir).filter((f) => f.endsWith('.md'));
    expect(files.length).toBe(1);
  });

  it('uses SearXNG snippet as fallback for thin HTML pages', async () => {
    globalThis.fetch = mock(async (url: string | URL | Request) => {
      const u = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
      if (u.includes('mock-searxng')) {
        return makeSearxngResponse([
          { title: 'JS Page', url: 'https://example.com/js-app', content: 'This is a detailed snippet from SearXNG about the JS-rendered page with important AML policy information.' },
        ]);
      }
      // Return a near-empty HTML page (JS-rendered, Readability gets nothing useful)
      return new Response('<html><body><nav>Menu</nav><script>app.render()</script></body></html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      });
    }) as typeof fetch;

    const result = await fetchHandler({ query: 'test' });
    const data = getJson(result);

    expect(data.added).toBe(1);
    expect(data.partial).toBe(1);
    expect(data.full).toBe(0);

    const rawDir = path.join(MOCK_WIKIS.wikis[0].path, 'raw', 'articles');
    const files = fs.readdirSync(rawDir).filter((f) => f.endsWith('.md'));
    const content = fs.readFileSync(path.join(rawDir, files[0]), 'utf8');
    expect(content).toContain('extraction: partial');
    expect(content).toContain('SearXNG');
  });

  it('reports full vs partial counts in response', async () => {
    globalThis.fetch = mock(async (url: string | URL | Request) => {
      const u = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
      if (u.includes('mock-searxng')) {
        return makeSearxngResponse([
          { title: 'Full Page', url: 'https://example.com/full', content: 'snippet' },
          { title: 'Thin Page', url: 'https://example.com/thin', content: 'A useful snippet about thin page content for testing.' },
        ]);
      }
      if (u.includes('/thin')) {
        return new Response('<html><body>tiny</body></html>', {
          status: 200,
          headers: { 'content-type': 'text/html' },
        });
      }
      return makeHtmlResponse('Full content here');
    }) as typeof fetch;

    const result = await fetchHandler({ query: 'test' });
    const data = getJson(result);

    expect(data.added).toBe(2);
    expect(data.full).toBe(1);
    expect(data.partial).toBe(1);
  });

  it('compact output stays under 4KB for 20 articles', async () => {
    const results = Array.from({ length: 20 }, (_, i) => ({
      title: `Article About Important Topic Number ${i + 1} With a Reasonably Long Title`,
      url: `https://example.com/articles/important-topic-number-${i + 1}/full-guide`,
      content: `Snippet ${i}`,
    }));

    globalThis.fetch = mock(async (url: string | URL | Request) => {
      const u = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
      if (u.includes('mock-searxng')) return makeSearxngResponse(results);
      return makeHtmlResponse(`Full content for article`);
    }) as typeof fetch;

    const result = await fetchHandler({ query: 'test', max_results: 20 });
    const text = getText(result);
    expect(text.length).toBeLessThan(4096);
    const data = JSON.parse(text);
    expect(data.added).toBe(20);
    expect(data.new_articles.length).toBe(20);
  });
});
