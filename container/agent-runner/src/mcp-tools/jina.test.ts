import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { tryJinaExtract } from './jina.js';

let originalFetch: typeof globalThis.fetch;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  delete process.env.JINA_READER_ENABLED;
  delete process.env.JINA_API_KEY;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.JINA_READER_ENABLED;
  delete process.env.JINA_API_KEY;
});

describe('tryJinaExtract', () => {
  it('returns extracted text from Jina response', async () => {
    const content = 'This is the extracted article content from Jina Reader.';
    globalThis.fetch = async () => new Response(content, { status: 200 });

    const result = await tryJinaExtract('https://example.com/article', 50000);
    expect(result).toBe(content);
  });

  it('returns null on fetch failure (graceful degradation)', async () => {
    globalThis.fetch = async () => { throw new Error('Network error'); };

    const result = await tryJinaExtract('https://example.com/down', 50000);
    expect(result).toBeNull();
  });

  it('returns null on non-OK response', async () => {
    globalThis.fetch = async () => new Response('Not found', { status: 404 });

    const result = await tryJinaExtract('https://example.com/missing', 50000);
    expect(result).toBeNull();
  });

  it('returns null when JINA_READER_ENABLED=false', async () => {
    process.env.JINA_READER_ENABLED = 'false';
    globalThis.fetch = async () => new Response('Should not be called', { status: 200 });

    const result = await tryJinaExtract('https://example.com/article', 50000);
    expect(result).toBeNull();
  });

  it('returns null when Jina content is shorter than minLength', async () => {
    globalThis.fetch = async () => new Response('Short', { status: 200 });

    const result = await tryJinaExtract('https://example.com/article', 50000, 100);
    expect(result).toBeNull();
  });

  it('returns content when longer than minLength', async () => {
    const content = 'A'.repeat(200);
    globalThis.fetch = async () => new Response(content, { status: 200 });

    const result = await tryJinaExtract('https://example.com/article', 50000, 100);
    expect(result).toBe(content);
  });

  it('truncates content exceeding maxChars', async () => {
    const content = 'X'.repeat(1000);
    globalThis.fetch = async () => new Response(content, { status: 200 });

    const result = await tryJinaExtract('https://example.com/article', 500);
    expect(result).not.toBeNull();
    expect(result!.length).toBeLessThanOrEqual(520); // 500 + truncation marker
    expect(result!).toContain('[Truncated]');
  });

  it('sends Authorization header when JINA_API_KEY is set', async () => {
    process.env.JINA_API_KEY = 'test-key-123';
    let capturedHeaders: Record<string, string> = {};

    globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
      const h = init?.headers as Record<string, string>;
      capturedHeaders = { ...h };
      return new Response('OK', { status: 200 });
    };

    await tryJinaExtract('https://example.com/article', 50000);
    expect(capturedHeaders['Authorization']).toBe('Bearer test-key-123');
  });

  it('constructs correct Jina URL', async () => {
    let capturedUrl = '';
    globalThis.fetch = async (input: string | URL | Request) => {
      capturedUrl = typeof input === 'string' ? input : input.toString();
      return new Response('OK', { status: 200 });
    };

    await tryJinaExtract('https://example.com/page?q=test', 50000);
    expect(capturedUrl).toBe('https://r.jina.ai/https://example.com/page?q=test');
  });
});
