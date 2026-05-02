import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { embedText, embedBatch } from './claim-embeddings.js';

const origFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = origFetch;
  delete process.env.NANOCLAW_EMBED_URL;
});

function mockEmbeddingResponse(dims: number, count = 1, nested = false) {
  const embeddings = Array.from({ length: count }, (_, i) => {
    const vec = new Array(dims).fill(0).map((_, j) => (i + 1) * 0.01 + j * 0.001);
    return { embedding: nested ? [vec] : vec };
  });
  return new Response(JSON.stringify(embeddings), { status: 200 });
}

describe('embedText', () => {
  test('returns Float32Array of 768 dimensions from mocked HTTP response', async () => {
    globalThis.fetch = mock(() => Promise.resolve(mockEmbeddingResponse(768))) as any;

    const result = await embedText('test text');
    expect(result).toBeInstanceOf(Float32Array);
    expect(result!.length).toBe(768);
  });

  test('returns null on connection error', async () => {
    globalThis.fetch = mock(() => Promise.reject(new Error('Connection refused'))) as any;

    const result = await embedText('test text');
    expect(result).toBeNull();
  });

  test('handles nested embedding format from llama-server', async () => {
    globalThis.fetch = mock(() => Promise.resolve(mockEmbeddingResponse(768, 1, true))) as any;

    const result = await embedText('test text');
    expect(result).toBeInstanceOf(Float32Array);
    expect(result!.length).toBe(768);
  });

  test('uses NANOCLAW_EMBED_URL env var', async () => {
    process.env.NANOCLAW_EMBED_URL = 'http://custom:9999/embedding';
    let capturedUrl = '';
    globalThis.fetch = mock((url: string) => {
      capturedUrl = url;
      return Promise.resolve(mockEmbeddingResponse(768));
    }) as any;

    await embedText('test');
    expect(capturedUrl).toBe('http://custom:9999/embedding');
  });
});

describe('embedBatch', () => {
  test('returns array of Float32Arrays', async () => {
    globalThis.fetch = mock(() => Promise.resolve(mockEmbeddingResponse(768, 3))) as any;

    const results = await embedBatch(['a', 'b', 'c']);
    expect(results.length).toBe(3);
    for (const r of results) {
      expect(r).toBeInstanceOf(Float32Array);
      expect(r.length).toBe(768);
    }
  });

  test('handles nested embedding format from llama-server', async () => {
    globalThis.fetch = mock(() => Promise.resolve(mockEmbeddingResponse(768, 3, true))) as any;

    const results = await embedBatch(['a', 'b', 'c']);
    expect(results.length).toBe(3);
    for (const r of results) {
      expect(r).toBeInstanceOf(Float32Array);
      expect(r.length).toBe(768);
    }
  });

  test('returns empty array on connection error', async () => {
    globalThis.fetch = mock(() => Promise.reject(new Error('Connection refused'))) as any;

    const results = await embedBatch(['a', 'b']);
    expect(results.length).toBe(0);
  });
});
