import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';

import { handleKnowledgeSearch, handleKnowledgeEmbed, expandSearchResults } from './knowledge-tools.js';
import { KnowledgeVectorStore } from './knowledge-vector-store.js';
import type { SearchResult } from './knowledge-vector-store.js';

let tmpDir: string;
let wikiDir: string;
const origFetch = globalThis.fetch;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'knowledge-tools-test-'));
  wikiDir = path.join(tmpDir, 'test-wiki');
  fs.mkdirSync(path.join(wikiDir, 'raw', 'articles'), { recursive: true });

  const wikisJsonPath = path.join(tmpDir, 'wikis.json');
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

describe('knowledge_search', () => {
  test('returns results from unified store with type and metadata', async () => {
    const store = new KnowledgeVectorStore(wikiDir);
    const v1 = new Float32Array(768); v1[0] = 1;
    const v2 = new Float32Array(768); v2[1] = 1;

    store.insertEntry({ text: 'TD Bank fined', contextual_text: '[TD Bank | Summary] TD Bank fined', type: 'claim', source_url: 'https://a.com', article_slug: 'td-bank', section: 'Summary', source_score: 0.8, wiki: 'test-wiki', embedding: v1 });
    store.insertEntry({ text: 'Investigation lasted years', contextual_text: '[TD Bank | Details] Investigation lasted years', type: 'sentence', source_url: 'https://a.com', article_slug: 'td-bank', section: 'Details', source_score: 0, wiki: 'test-wiki', embedding: v2 });
    store.close();

    globalThis.fetch = mock(() => {
      const emb = new Array(768).fill(0); emb[0] = 1;
      return Promise.resolve(new Response(JSON.stringify([{ embedding: emb }]), { status: 200 }));
    }) as any;

    const result = await handleKnowledgeSearch({ wiki: 'test-wiki', query: 'bank fine', top_k: 2 });
    const data = JSON.parse(result.content[0].text);
    expect(data.results.length).toBe(2);
    expect(data.results[0].text).toBe('TD Bank fined');
    expect(data.results[0].type).toBe('claim');
    expect(data.results[0].article_slug).toBe('td-bank');
  });

  test('filters by type when specified', async () => {
    const store = new KnowledgeVectorStore(wikiDir);
    const v = new Float32Array(768); v[0] = 1;
    store.insertEntry({ text: 'A claim', contextual_text: 'A claim', type: 'claim', source_url: null, article_slug: 'a', section: '', source_score: 0, wiki: 'w', embedding: v });
    store.insertEntry({ text: 'A sentence', contextual_text: 'A sentence', type: 'sentence', source_url: null, article_slug: 'a', section: '', source_score: 0, wiki: 'w', embedding: v });
    store.close();

    globalThis.fetch = mock(() => {
      const emb = new Array(768).fill(0); emb[0] = 1;
      return Promise.resolve(new Response(JSON.stringify([{ embedding: emb }]), { status: 200 }));
    }) as any;

    const result = await handleKnowledgeSearch({ wiki: 'test-wiki', query: 'test', type: 'sentence' });
    const data = JSON.parse(result.content[0].text);
    expect(data.results.length).toBe(1);
    expect(data.results[0].type).toBe('sentence');
  });

  test('accepts type=insight and filters results', async () => {
    const store = new KnowledgeVectorStore(wikiDir);
    const v = new Float32Array(768); v[0] = 1;
    store.insertEntry({ text: 'A claim', contextual_text: 'A claim', type: 'claim', source_url: null, article_slug: 'a', section: '', source_score: 0, wiki: 'w', embedding: v });
    store.insertEntry({ text: 'A sentence', contextual_text: 'A sentence', type: 'sentence', source_url: null, article_slug: 'a', section: '', source_score: 0, wiki: 'w', embedding: v });
    store.insertEntry({ text: 'An insight', contextual_text: 'An insight', type: 'insight', source_url: null, article_slug: 'a', section: '', source_score: 0, wiki: 'w', embedding: v });
    store.close();

    globalThis.fetch = mock(() => {
      const emb = new Array(768).fill(0); emb[0] = 1;
      return Promise.resolve(new Response(JSON.stringify([{ embedding: emb }]), { status: 200 }));
    }) as any;

    const result = await handleKnowledgeSearch({ wiki: 'test-wiki', query: 'test', type: 'insight' });
    const data = JSON.parse(result.content[0].text);
    expect(data.results.length).toBe(1);
    expect(data.results[0].type).toBe('insight');
    expect(data.results[0].text).toBe('An insight');
  });
});

describe('expandSearchResults', () => {
  function seedArticle(store: KnowledgeVectorStore, slug: string, count: number): number[] {
    const ids: number[] = [];
    for (let i = 0; i < count; i++) {
      ids.push(store.insertEntry({
        text: `${slug} s${i}`,
        contextual_text: `Document: ${slug}. ${slug} s${i}`,
        type: 'sentence',
        source_url: null,
        article_slug: slug,
        section: '',
        source_score: 0,
        wiki: 'w',
        embedding: new Float32Array(4),
      }));
    }
    return ids;
  }

  function makeResult(id: number, slug: string, similarity: number): SearchResult {
    return {
      id,
      text: `${slug} match`,
      contextual_text: `Document: ${slug}. ${slug} match`,
      type: 'sentence',
      source_url: null,
      article_slug: slug,
      section: '',
      source_score: 0,
      wiki: 'w',
      created: '2026-01-01',
      similarity,
    };
  }

  test('non-overlapping windows return separate parent_text per result', () => {
    const store = new KnowledgeVectorStore(wikiDir);
    const idsA = seedArticle(store, 'art-a', 20);
    const idsB = seedArticle(store, 'art-b', 20);

    const results: SearchResult[] = [
      makeResult(idsA[10], 'art-a', 0.9),
      makeResult(idsB[5], 'art-b', 0.8),
    ];

    const expanded = expandSearchResults(results, store, 2);
    expect(expanded).toHaveLength(2);
    expect(expanded[0].parent_text).toBeDefined();
    expect(expanded[1].parent_text).toBeDefined();
    // parent_text should contain multiple sentences
    expect(expanded[0].parent_text!.split('\n').length).toBeGreaterThanOrEqual(3);
    store.close();
  });

  test('overlapping windows from same article merge into single result', () => {
    const store = new KnowledgeVectorStore(wikiDir);
    const ids = seedArticle(store, 'art-a', 20);

    // Two matches 2 apart — with window_size=3, windows overlap
    const results: SearchResult[] = [
      makeResult(ids[10], 'art-a', 0.9),
      makeResult(ids[12], 'art-a', 0.7),
    ];

    const expanded = expandSearchResults(results, store, 3);
    expect(expanded).toHaveLength(1); // merged
    expect(expanded[0].similarity).toBe(0.9); // best score
    expect(expanded[0].matched_sentences).toHaveLength(2);
    store.close();
  });

  test('non-overlapping windows from same article stay separate', () => {
    const store = new KnowledgeVectorStore(wikiDir);
    const ids = seedArticle(store, 'art-a', 20);

    // Two matches far apart — with window_size=2, windows don't overlap
    const results: SearchResult[] = [
      makeResult(ids[2], 'art-a', 0.9),
      makeResult(ids[15], 'art-a', 0.8),
    ];

    const expanded = expandSearchResults(results, store, 2);
    expect(expanded).toHaveLength(2);
    store.close();
  });

  test('parent_text contains matched sentence text alongside window', () => {
    const store = new KnowledgeVectorStore(wikiDir);
    const ids = seedArticle(store, 'art-a', 10);

    const results: SearchResult[] = [
      makeResult(ids[5], 'art-a', 0.9),
    ];

    const expanded = expandSearchResults(results, store, 2);
    expect(expanded).toHaveLength(1);
    // parent_text should include the window sentences
    expect(expanded[0].parent_text).toContain('art-a s3');
    expect(expanded[0].parent_text).toContain('art-a s5');
    expect(expanded[0].parent_text).toContain('art-a s7');
    store.close();
  });
});

describe('knowledge_search with expand', () => {
  test('expand=none returns results without parent_text', async () => {
    const store = new KnowledgeVectorStore(wikiDir);
    const v = new Float32Array(768); v[0] = 1;
    store.insertEntry({ text: 'Sentence one', contextual_text: 'Sentence one', type: 'sentence', source_url: null, article_slug: 'a', section: '', source_score: 0, wiki: 'w', embedding: v });
    store.close();

    globalThis.fetch = mock(() => {
      const emb = new Array(768).fill(0); emb[0] = 1;
      return Promise.resolve(new Response(JSON.stringify([{ embedding: emb }]), { status: 200 }));
    }) as any;

    const result = await handleKnowledgeSearch({ wiki: 'test-wiki', query: 'test', expand: 'none' });
    const data = JSON.parse(result.content[0].text);
    expect(data.results[0].parent_text).toBeUndefined();
  });

  test('expand=window adds parent_text to results', async () => {
    const store = new KnowledgeVectorStore(wikiDir);
    const v = new Float32Array(768); v[0] = 1;
    for (let i = 0; i < 10; i++) {
      store.insertEntry({ text: `Sentence ${i}`, contextual_text: `Sentence ${i}`, type: 'sentence', source_url: null, article_slug: 'a', section: '', source_score: 0, wiki: 'w', embedding: v });
    }
    store.close();

    globalThis.fetch = mock(() => {
      const emb = new Array(768).fill(0); emb[0] = 1;
      return Promise.resolve(new Response(JSON.stringify([{ embedding: emb }]), { status: 200 }));
    }) as any;

    const result = await handleKnowledgeSearch({ wiki: 'test-wiki', query: 'test', expand: 'window', window_size: 2 });
    const data = JSON.parse(result.content[0].text);
    // With expand, results should have parent_text
    expect(data.results.length).toBeGreaterThan(0);
    expect(data.results[0].parent_text).toBeDefined();
  });
});

describe('knowledge_embed', () => {
  test('embeds article sentences into knowledge.db', async () => {
    fs.writeFileSync(path.join(wikiDir, 'raw', 'articles', 'test.md'), `---
title: "Test Article"
source_url: https://test.com
---

## Summary

This is the first sentence. This is the second sentence.
`);

    globalThis.fetch = mock((_url: string | URL | Request, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      const count = Array.isArray(body.content) ? body.content.length : 1;
      const embeddings = Array.from({ length: count }, (_, i) => ({
        embedding: new Array(768).fill(0).map((_, j) => (i + 1) * 0.01 + j * 0.001),
      }));
      return Promise.resolve(new Response(JSON.stringify(embeddings), { status: 200 }));
    }) as any;

    const result = await handleKnowledgeEmbed({ wiki: 'test-wiki', source: 'raw' });
    const data = JSON.parse(result.content[0].text);
    expect(data.embedded).toBeGreaterThan(0);
    expect(data.articles_processed).toBe(1);
  });
});
