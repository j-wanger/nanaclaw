import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';

import { handleKnowledgeSearch, handleKnowledgeEmbed } from './knowledge-tools.js';
import { KnowledgeVectorStore } from './knowledge-vector-store.js';

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
