import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { handleClaimEmbed, handleClaimSearch, handleClaimDedup } from './claim-tools.js';
import { KnowledgeVectorStore } from './knowledge-vector-store.js';

let tmpDir: string;
let wikisJsonPath: string;
const origFetch = globalThis.fetch;

function makeClaimLine(claim: string, url: string | null = null): string {
  return JSON.stringify({
    claim,
    source_url: url,
    source_score: 0.5,
    wiki: 'test-wiki',
    created: '2026-04-30',
  });
}

function mockEmbeddings(count: number) {
  const embeddings = Array.from({ length: count }, (_, i) => ({
    embedding: new Array(768).fill(0).map((_, j) => (i + 1) * 0.01 + j * 0.001),
  }));
  return new Response(JSON.stringify(embeddings), { status: 200 });
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claim-tools-test-'));
  const wikiDir = path.join(tmpDir, 'test-wiki');
  fs.mkdirSync(wikiDir, { recursive: true });

  wikisJsonPath = path.join(tmpDir, 'wikis.json');
  fs.writeFileSync(wikisJsonPath, JSON.stringify({
    version: 1,
    wikis: [{ name: 'test-wiki', path: wikiDir, description: 'Test wiki' }],
  }));
  process.env.WIKIS_JSON_PATH = wikisJsonPath;
});

afterEach(() => {
  globalThis.fetch = origFetch;
  delete process.env.WIKIS_JSON_PATH;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('claim_embed', () => {
  test('triggers pipeline and returns embedded count', async () => {
    const wikiDir = path.join(tmpDir, 'test-wiki');
    const jsonl = [makeClaimLine('Claim 1'), makeClaimLine('Claim 2')].join('\n') + '\n';
    fs.writeFileSync(path.join(wikiDir, 'claims.jsonl'), jsonl);

    globalThis.fetch = mock(() => Promise.resolve(mockEmbeddings(2))) as any;

    const result = await handleClaimEmbed({ wiki: 'test-wiki' });
    const text = result.content[0].text;
    expect(text).toContain('2');
    expect(text).toContain('embedded');
  });
});

describe('claim_search', () => {
  test('returns top-k results with metadata for query text', async () => {
    const wikiDir = path.join(tmpDir, 'test-wiki');
    const store = new KnowledgeVectorStore(wikiDir);
    const v1 = new Float32Array(768);
    v1[0] = 1;
    const v2 = new Float32Array(768);
    v2[1] = 1;
    store.insertEntry({ text: 'Water is wet', contextual_text: 'Water is wet', type: 'claim', source_url: 'https://a.com', article_slug: '', section: '', source_score: 0.8, wiki: 'test-wiki', embedding: v1 });
    store.insertEntry({ text: 'Fire is hot', contextual_text: 'Fire is hot', type: 'claim', source_url: 'https://b.com', article_slug: '', section: '', source_score: 0.6, wiki: 'test-wiki', embedding: v2 });
    store.close();

    // Mock embedText to return a vector close to v1
    globalThis.fetch = mock(() => {
      const emb = new Array(768).fill(0);
      emb[0] = 1;
      return Promise.resolve(new Response(JSON.stringify([{ embedding: emb }]), { status: 200 }));
    }) as any;

    const result = await handleClaimSearch({ wiki: 'test-wiki', query: 'water properties', top_k: 1 });
    const text = result.content[0].text;
    const data = JSON.parse(text);
    expect(data.results.length).toBe(1);
    expect(data.results[0].text).toBe('Water is wet');
    expect(data.results[0].source_url).toBe('https://a.com');
  });
});

describe('claim_dedup', () => {
  test('returns duplicate pairs above threshold with source attribution', async () => {
    const wikiDir = path.join(tmpDir, 'test-wiki');
    const store = new KnowledgeVectorStore(wikiDir);

    const v1 = new Float32Array(768);
    v1[0] = 1;
    const v2 = new Float32Array(768);
    v2[0] = 0.99; v2[1] = 0.01;
    const v3 = new Float32Array(768);
    v3[1] = 1;

    store.insertEntry({ text: 'Claim X', contextual_text: 'Claim X', type: 'claim', source_url: 'https://x.com', article_slug: '', section: '', source_score: 0.9, wiki: 'test-wiki', embedding: v1 });
    store.insertEntry({ text: 'Claim X rephrased', contextual_text: 'Claim X rephrased', type: 'claim', source_url: 'https://y.com', article_slug: '', section: '', source_score: 0.7, wiki: 'test-wiki', embedding: v2 });
    store.insertEntry({ text: 'Unrelated', contextual_text: 'Unrelated', type: 'claim', source_url: null, article_slug: '', section: '', source_score: 0, wiki: 'test-wiki', embedding: v3 });
    store.close();

    const result = await handleClaimDedup({ wiki: 'test-wiki', threshold: 0.92 });
    const text = result.content[0].text;
    const data = JSON.parse(text);
    expect(data.duplicates.length).toBe(1);
    expect(data.duplicates[0].similarity).toBeGreaterThan(0.92);
  });
});
