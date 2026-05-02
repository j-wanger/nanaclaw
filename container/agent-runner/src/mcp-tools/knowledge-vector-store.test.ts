import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';

import { KnowledgeVectorStore } from './knowledge-vector-store.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'knowledge-store-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function makeEmbedding(seed: number): Float32Array {
  const arr = new Float32Array(4);
  for (let i = 0; i < 4; i++) arr[i] = Math.sin(seed + i);
  return arr;
}

describe('KnowledgeVectorStore', () => {
  it('creates knowledge.db on construction', () => {
    const store = new KnowledgeVectorStore(tmpDir);
    store.close();
    expect(fs.existsSync(path.join(tmpDir, 'knowledge.db'))).toBe(true);
  });

  it('inserts claim entries with type=claim', () => {
    const store = new KnowledgeVectorStore(tmpDir);
    const id = store.insertEntry({
      text: 'Water boils at 100C.',
      contextual_text: '[Boiling Points | Physics] Water boils at 100C.',
      type: 'claim',
      source_url: 'https://example.com',
      article_slug: 'boiling-points',
      section: 'Physics',
      source_score: 0.8,
      wiki: 'test-wiki',
      embedding: makeEmbedding(1),
    });
    expect(id).toBeGreaterThan(0);

    const row = store.getById(id);
    expect(row).not.toBeNull();
    expect(row!.text).toBe('Water boils at 100C.');
    expect(row!.type).toBe('claim');
    store.close();
  });

  it('inserts insight entries with type=insight', () => {
    const store = new KnowledgeVectorStore(tmpDir);
    const id = store.insertEntry({
      text: 'Use Pattern 2 (decision-tree) over natural-language for small models.',
      contextual_text: '[Tool Use Patterns | Recommendations] Use Pattern 2 (decision-tree) over natural-language for small models.',
      type: 'insight',
      source_url: 'https://example.com/patterns',
      article_slug: 'tool-use-patterns',
      section: 'Recommendations',
      source_score: 0.7,
      wiki: 'test-wiki',
      embedding: makeEmbedding(5),
    });
    const row = store.getById(id);
    expect(row!.type).toBe('insight');
    store.close();
  });

  it('getAllByType filters insight type correctly', () => {
    const store = new KnowledgeVectorStore(tmpDir);
    store.insertEntry({ text: 'Claim', contextual_text: 'C', type: 'claim', source_url: null, article_slug: 'a', section: '', source_score: 0, wiki: 'w', embedding: makeEmbedding(1) });
    store.insertEntry({ text: 'Sentence', contextual_text: 'S', type: 'sentence', source_url: null, article_slug: 'a', section: '', source_score: 0, wiki: 'w', embedding: makeEmbedding(2) });
    store.insertEntry({ text: 'Insight 1', contextual_text: 'I1', type: 'insight', source_url: null, article_slug: 'a', section: '', source_score: 0, wiki: 'w', embedding: makeEmbedding(3) });
    store.insertEntry({ text: 'Insight 2', contextual_text: 'I2', type: 'insight', source_url: null, article_slug: 'a', section: '', source_score: 0, wiki: 'w', embedding: makeEmbedding(4) });

    expect(store.getAllByType('insight')).toHaveLength(2);
    expect(store.getAllByType('claim')).toHaveLength(1);
    expect(store.getAllByType('sentence')).toHaveLength(1);
    expect(store.getAllByType()).toHaveLength(4);
    store.close();
  });

  it('inserts sentence entries with type=sentence', () => {
    const store = new KnowledgeVectorStore(tmpDir);
    const id = store.insertEntry({
      text: 'The experiment was conducted in 2023.',
      contextual_text: '[Lab Report | Methods] The experiment was conducted in 2023.',
      type: 'sentence',
      source_url: 'https://example.com/report',
      article_slug: 'lab-report',
      section: 'Methods',
      source_score: 0,
      wiki: 'test-wiki',
      embedding: makeEmbedding(2),
    });
    const row = store.getById(id);
    expect(row!.type).toBe('sentence');
    store.close();
  });

  it('getAllByType filters correctly', () => {
    const store = new KnowledgeVectorStore(tmpDir);
    store.insertEntry({ text: 'Claim 1', contextual_text: 'Claim 1', type: 'claim', source_url: null, article_slug: 'a', section: '', source_score: 0, wiki: 'w', embedding: makeEmbedding(1) });
    store.insertEntry({ text: 'Sentence 1', contextual_text: 'Sentence 1', type: 'sentence', source_url: null, article_slug: 'a', section: '', source_score: 0, wiki: 'w', embedding: makeEmbedding(2) });
    store.insertEntry({ text: 'Claim 2', contextual_text: 'Claim 2', type: 'claim', source_url: null, article_slug: 'a', section: '', source_score: 0, wiki: 'w', embedding: makeEmbedding(3) });

    expect(store.getAllByType('claim')).toHaveLength(2);
    expect(store.getAllByType('sentence')).toHaveLength(1);
    expect(store.getAllByType()).toHaveLength(3);
    store.close();
  });

  it('searchSimilar returns top-K results sorted by similarity', () => {
    const store = new KnowledgeVectorStore(tmpDir);
    const target = makeEmbedding(999);

    for (let i = 0; i < 20; i++) {
      store.insertEntry({ text: `Sentence ${i}`, contextual_text: `Sentence ${i}`, type: 'sentence', source_url: null, article_slug: 'a', section: '', source_score: 0, wiki: 'w', embedding: makeEmbedding(i) });
    }
    // Insert one that matches the query closely
    store.insertEntry({ text: 'Close match', contextual_text: 'Close match', type: 'sentence', source_url: null, article_slug: 'a', section: '', source_score: 0, wiki: 'w', embedding: target });

    const results = store.searchSimilar(target, 5);
    expect(results).toHaveLength(5);
    expect(results[0].text).toBe('Close match');
    expect(results[0].similarity).toBeCloseTo(1.0, 3);

    // Sorted descending
    for (let i = 1; i < results.length; i++) {
      expect(results[i].similarity).toBeLessThanOrEqual(results[i - 1].similarity);
    }
    store.close();
  });

  it('searchSimilar with type filter only returns matching type', () => {
    const store = new KnowledgeVectorStore(tmpDir);
    const query = makeEmbedding(1);

    store.insertEntry({ text: 'Claim A', contextual_text: 'Claim A', type: 'claim', source_url: null, article_slug: 'a', section: '', source_score: 0, wiki: 'w', embedding: query });
    store.insertEntry({ text: 'Sentence B', contextual_text: 'Sentence B', type: 'sentence', source_url: null, article_slug: 'a', section: '', source_score: 0, wiki: 'w', embedding: query });

    const claimResults = store.searchSimilar(query, 10, 'claim');
    expect(claimResults).toHaveLength(1);
    expect(claimResults[0].type).toBe('claim');

    const sentenceResults = store.searchSimilar(query, 10, 'sentence');
    expect(sentenceResults).toHaveLength(1);
    expect(sentenceResults[0].type).toBe('sentence');

    const allResults = store.searchSimilar(query, 10);
    expect(allResults).toHaveLength(2);
    store.close();
  });

  it('has article_slug index', () => {
    const store = new KnowledgeVectorStore(tmpDir);
    const indexes = (store as any).db.prepare("PRAGMA index_list('knowledge')").all() as Array<{ name: string }>;
    const names = indexes.map((i) => i.name);
    expect(names).toContain('idx_knowledge_article');
    store.close();
  });

  it('getByArticleSlug returns rows with embeddings for a given slug', () => {
    const store = new KnowledgeVectorStore(tmpDir);
    const emb1 = makeEmbedding(10);
    const emb2 = makeEmbedding(20);
    const emb3 = makeEmbedding(30);

    store.insertEntry({ text: 'S1 in article-a', contextual_text: 'S1', type: 'sentence', source_url: null, article_slug: 'article-a', section: 'Intro', source_score: 0, wiki: 'w', embedding: emb1 });
    store.insertEntry({ text: 'C1 in article-a', contextual_text: 'C1', type: 'claim', source_url: null, article_slug: 'article-a', section: 'Body', source_score: 0.5, wiki: 'w', embedding: emb2 });
    store.insertEntry({ text: 'S2 in article-b', contextual_text: 'S2', type: 'sentence', source_url: null, article_slug: 'article-b', section: '', source_score: 0, wiki: 'w', embedding: emb3 });

    const results = store.getByArticleSlug('article-a');
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.article_slug === 'article-a')).toBe(true);
    expect(results[0].embedding).toBeInstanceOf(Float32Array);
    expect(results[0].embedding.length).toBe(4);
    store.close();
  });

  it('getByArticleSlug filters by type when provided', () => {
    const store = new KnowledgeVectorStore(tmpDir);

    store.insertEntry({ text: 'Sentence', contextual_text: 'S', type: 'sentence', source_url: null, article_slug: 'slug-x', section: '', source_score: 0, wiki: 'w', embedding: makeEmbedding(1) });
    store.insertEntry({ text: 'Claim', contextual_text: 'C', type: 'claim', source_url: null, article_slug: 'slug-x', section: '', source_score: 0, wiki: 'w', embedding: makeEmbedding(2) });

    const sentences = store.getByArticleSlug('slug-x', 'sentence');
    expect(sentences).toHaveLength(1);
    expect(sentences[0].type).toBe('sentence');

    const claims = store.getByArticleSlug('slug-x', 'claim');
    expect(claims).toHaveLength(1);
    expect(claims[0].type).toBe('claim');
    store.close();
  });

  it('getByArticleSlug returns empty array for unknown slug', () => {
    const store = new KnowledgeVectorStore(tmpDir);
    const results = store.getByArticleSlug('nonexistent');
    expect(results).toHaveLength(0);
    store.close();
  });

  it('chunked search works correctly across batches', () => {
    const store = new KnowledgeVectorStore(tmpDir);
    const query = makeEmbedding(50);

    // Insert more than one chunk (SEARCH_CHUNK_SIZE) — use a small set but verify correctness
    for (let i = 0; i < 25; i++) {
      store.insertEntry({ text: `Entry ${i}`, contextual_text: `Entry ${i}`, type: 'sentence', source_url: null, article_slug: 'a', section: '', source_score: 0, wiki: 'w', embedding: makeEmbedding(i) });
    }

    const results = store.searchSimilar(query, 3);
    expect(results).toHaveLength(3);
    // Results should be sorted by similarity descending
    expect(results[0].similarity).toBeGreaterThanOrEqual(results[1].similarity);
    expect(results[1].similarity).toBeGreaterThanOrEqual(results[2].similarity);
    store.close();
  });
});
