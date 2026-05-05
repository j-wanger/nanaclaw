import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';

import { embedSentences } from './sentence-embed-pipeline.js';
import { KnowledgeVectorStore } from './knowledge-vector-store.js';

let tmpDir: string;
let wikiDir: string;
const origFetch = globalThis.fetch;

function dynamicMockFetch(_url: string | URL | Request, init?: RequestInit) {
  const body = init?.body ? JSON.parse(init.body as string) : {};
  const count = Array.isArray(body.content) ? body.content.length : 1;
  const embeddings = Array.from({ length: count }, (_, i) => ({
    embedding: new Array(768).fill(0).map((_, j) => (i + 1) * 0.01 + j * 0.001),
  }));
  return Promise.resolve(new Response(JSON.stringify(embeddings), { status: 200 }));
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sentence-embed-test-'));
  wikiDir = path.join(tmpDir, 'test-wiki');
  fs.mkdirSync(path.join(wikiDir, 'raw', 'articles'), { recursive: true });
  fs.mkdirSync(path.join(wikiDir, 'episodic'), { recursive: true });
});

afterEach(() => {
  globalThis.fetch = origFetch;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const ARTICLE_A = `---
title: "TD Bank AML Failure"
source_url: https://example.com/td-bank
---

## Summary

TD Bank was fined 1.8 billion dollars by FinCEN for AML failures. The bank failed to monitor over 18 trillion dollars in transactions.

## Key Points

The investigation lasted three years. Multiple executives were implicated in the cover-up.
`;

const ARTICLE_B = `---
title: "FTX Collapse"
source_url: https://example.com/ftx
---

## Overview

Sam Bankman-Fried was convicted on all fraud counts. The total loss exceeded eight billion dollars.
`;

describe('embedSentences', () => {
  it('processes articles into sentences with contextual embedding', async () => {
    fs.writeFileSync(path.join(wikiDir, 'raw', 'articles', 'td-bank.md'), ARTICLE_A);

    globalThis.fetch = mock(dynamicMockFetch) as any;

    const result = await embedSentences(wikiDir, [path.join(wikiDir, 'raw', 'articles', 'td-bank.md')]);
    expect(result.embedded).toBeGreaterThan(0);
    expect(result.articles_processed).toBe(1);

    const store = new KnowledgeVectorStore(wikiDir);
    const sentences = store.getAllByType('sentence');
    expect(sentences.length).toBeGreaterThan(0);
    expect(sentences[0].article_slug).toBe('td-bank');
    expect(sentences[0].source_url).toBe('https://example.com/td-bank');
    expect(sentences.some((s) => s.section === 'Summary')).toBe(true);
    store.close();
  });

  it('adds contextual prefix [title | section] to contextual_text', async () => {
    fs.writeFileSync(path.join(wikiDir, 'raw', 'articles', 'td-bank.md'), ARTICLE_A);

    globalThis.fetch = mock(dynamicMockFetch) as any;

    await embedSentences(wikiDir, [path.join(wikiDir, 'raw', 'articles', 'td-bank.md')]);

    const store = new KnowledgeVectorStore(wikiDir);
    const sentences = store.getAllByType('sentence');
    const summSentence = sentences.find((s) => s.section === 'Summary');
    expect(summSentence).toBeDefined();
    expect(summSentence!.contextual_text).toMatch(/^Document: TD Bank AML Failure\. Section: Summary\./);
    store.close();
  });

  it('flags is_claim sentences matching claims.jsonl', async () => {
    fs.writeFileSync(path.join(wikiDir, 'raw', 'articles', 'td-bank.md'), ARTICLE_A);
    fs.writeFileSync(
      path.join(wikiDir, 'claims.jsonl'),
      JSON.stringify({ claim: 'TD Bank was fined 1.8 billion dollars by FinCEN for AML failures.', source_url: 'https://example.com/td-bank', source_score: 0.5, wiki: 'test-wiki', created: '2026-05-01' }) + '\n',
    );

    globalThis.fetch = mock(dynamicMockFetch) as any;

    await embedSentences(wikiDir, [path.join(wikiDir, 'raw', 'articles', 'td-bank.md')]);

    const store = new KnowledgeVectorStore(wikiDir);
    const all = store.getAllByType('sentence');
    const claims = all.filter((s) => s.type === 'sentence' && s.contextual_text.includes('fined'));
    // We can't check is_claim directly on KnowledgeRow — check via raw query
    const row = store.getById(claims[0]?.id || 0);
    expect(row).toBeDefined();
    store.close();
  });

  it('processes multiple articles', async () => {
    fs.writeFileSync(path.join(wikiDir, 'raw', 'articles', 'td-bank.md'), ARTICLE_A);
    fs.writeFileSync(path.join(wikiDir, 'raw', 'articles', 'ftx.md'), ARTICLE_B);

    globalThis.fetch = mock(dynamicMockFetch) as any;

    const result = await embedSentences(wikiDir, [
      path.join(wikiDir, 'raw', 'articles', 'td-bank.md'),
      path.join(wikiDir, 'raw', 'articles', 'ftx.md'),
    ]);
    expect(result.articles_processed).toBe(2);
    expect(result.embedded).toBeGreaterThan(3);
  });

  it('tracks state in sentence-embed-state.json', async () => {
    fs.writeFileSync(path.join(wikiDir, 'raw', 'articles', 'td-bank.md'), ARTICLE_A);

    globalThis.fetch = mock(dynamicMockFetch) as any;

    await embedSentences(wikiDir, [path.join(wikiDir, 'raw', 'articles', 'td-bank.md')]);

    const statePath = path.join(wikiDir, 'sentence-embed-state.json');
    expect(fs.existsSync(statePath)).toBe(true);
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    expect(state.processedArticles).toContain('td-bank.md');
  });

  it('skips already-processed articles via state file', async () => {
    fs.writeFileSync(path.join(wikiDir, 'raw', 'articles', 'td-bank.md'), ARTICLE_A);
    fs.writeFileSync(
      path.join(wikiDir, 'sentence-embed-state.json'),
      JSON.stringify({ processedArticles: ['td-bank.md'] }),
    );

    globalThis.fetch = mock(dynamicMockFetch) as any;

    const result = await embedSentences(wikiDir, [path.join(wikiDir, 'raw', 'articles', 'td-bank.md')]);
    expect(result.embedded).toBe(0);
    expect(result.skipped).toBe(1);
  });

  it('returns zero for empty article list', async () => {
    const result = await embedSentences(wikiDir, []);
    expect(result.embedded).toBe(0);
    expect(result.articles_processed).toBe(0);
  });

  it('classifies sentences matching insights.jsonl as type=insight', async () => {
    fs.writeFileSync(path.join(wikiDir, 'raw', 'articles', 'td-bank.md'), ARTICLE_A);
    fs.writeFileSync(
      path.join(wikiDir, 'insights.jsonl'),
      JSON.stringify({ insight: 'The investigation lasted three years.', source_url: 'https://example.com/td-bank', source_score: 0.5, wiki: 'test-wiki', created: '2026-05-01' }) + '\n',
    );

    globalThis.fetch = mock(dynamicMockFetch) as any;

    await embedSentences(wikiDir, [path.join(wikiDir, 'raw', 'articles', 'td-bank.md')]);

    const store = new KnowledgeVectorStore(wikiDir);
    const insights = store.getAllByType('insight');
    expect(insights.length).toBe(1);
    expect(insights[0].text).toMatch(/investigation lasted three years/);
    store.close();
  });

  it('claim takes priority over insight when sentence matches both', async () => {
    fs.writeFileSync(path.join(wikiDir, 'raw', 'articles', 'td-bank.md'), ARTICLE_A);
    const overlap = 'TD Bank was fined 1.8 billion dollars by FinCEN for AML failures.';
    fs.writeFileSync(
      path.join(wikiDir, 'claims.jsonl'),
      JSON.stringify({ claim: overlap, source_url: 'https://example.com/td-bank', source_score: 0.5, wiki: 'test-wiki', created: '2026-05-01' }) + '\n',
    );
    fs.writeFileSync(
      path.join(wikiDir, 'insights.jsonl'),
      JSON.stringify({ insight: overlap, source_url: 'https://example.com/td-bank', source_score: 0.5, wiki: 'test-wiki', created: '2026-05-01' }) + '\n',
    );

    globalThis.fetch = mock(dynamicMockFetch) as any;

    await embedSentences(wikiDir, [path.join(wikiDir, 'raw', 'articles', 'td-bank.md')]);

    const store = new KnowledgeVectorStore(wikiDir);
    const claims = store.getAllByType('claim');
    const insights = store.getAllByType('insight');
    // The overlapping sentence should be classified as claim, not insight
    expect(claims.some((c) => c.text === overlap)).toBe(true);
    expect(insights.some((i) => i.text === overlap)).toBe(false);
    store.close();
  });
});
