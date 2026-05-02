import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';

import { KnowledgeVectorStore } from './knowledge-vector-store.js';
import { findArticleConflicts, findQueryConflicts } from './knowledge-conflicts.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'conflicts-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function makeEmbedding(values: number[]): Float32Array {
  return new Float32Array(values);
}

function seedStore(store: KnowledgeVectorStore) {
  // Article A — two sentences
  store.insertEntry({ text: 'Water boils at 100C at sea level.', contextual_text: '[A | Physics] Water boils at 100C at sea level.', type: 'sentence', source_url: 'https://a.com', article_slug: 'article-a', section: 'Physics', source_score: 0.9, wiki: 'test', embedding: makeEmbedding([1, 0, 0, 0]) });
  store.insertEntry({ text: 'Ice melts at 0C.', contextual_text: '[A | Physics] Ice melts at 0C.', type: 'sentence', source_url: 'https://a.com', article_slug: 'article-a', section: 'Physics', source_score: 0.9, wiki: 'test', embedding: makeEmbedding([0, 1, 0, 0]) });

  // Article B — similar sentence to A (potential conflict), and an unrelated one
  store.insertEntry({ text: 'Water boils at 99C under normal conditions.', contextual_text: '[B | Chemistry] Water boils at 99C under normal conditions.', type: 'sentence', source_url: 'https://b.com', article_slug: 'article-b', section: 'Chemistry', source_score: 0.7, wiki: 'test', embedding: makeEmbedding([0.98, 0.05, 0, 0]) });
  store.insertEntry({ text: 'The sky is blue.', contextual_text: '[B | Optics] The sky is blue.', type: 'sentence', source_url: 'https://b.com', article_slug: 'article-b', section: 'Optics', source_score: 0.7, wiki: 'test', embedding: makeEmbedding([0, 0, 1, 0]) });

  // Article C — another similar sentence
  store.insertEntry({ text: 'Pure water boils at exactly 100 degrees Celsius.', contextual_text: '[C | Science] Pure water boils at exactly 100 degrees Celsius.', type: 'sentence', source_url: 'https://c.com', article_slug: 'article-c', section: 'Science', source_score: 0.8, wiki: 'test', embedding: makeEmbedding([0.95, 0.1, 0, 0]) });
}

describe('findArticleConflicts', () => {
  it('returns cross-article pairs sorted by descending similarity', () => {
    const store = new KnowledgeVectorStore(tmpDir);
    seedStore(store);

    const pairs = findArticleConflicts(store, 'article-a', 10);
    expect(pairs.length).toBeGreaterThan(0);

    // All pairs should involve article-a on one side and a different article on the other
    for (const pair of pairs) {
      const slugs = [pair.a.article_slug, pair.b.article_slug];
      expect(slugs).toContain('article-a');
      expect(slugs[0]).not.toBe(slugs[1]);
    }

    // Sorted descending by similarity
    for (let i = 1; i < pairs.length; i++) {
      expect(pairs[i].similarity).toBeLessThanOrEqual(pairs[i - 1].similarity);
    }
    store.close();
  });

  it('excludes same-article matches', () => {
    const store = new KnowledgeVectorStore(tmpDir);
    seedStore(store);

    const pairs = findArticleConflicts(store, 'article-a', 100);
    for (const pair of pairs) {
      expect(pair.a.article_slug).not.toBe(pair.b.article_slug);
    }
    store.close();
  });

  it('respects minSimilarity threshold', () => {
    const store = new KnowledgeVectorStore(tmpDir);
    seedStore(store);

    const highThreshold = findArticleConflicts(store, 'article-a', 10, 0.99);
    const lowThreshold = findArticleConflicts(store, 'article-a', 10, 0.1);

    expect(lowThreshold.length).toBeGreaterThanOrEqual(highThreshold.length);

    for (const pair of highThreshold) {
      expect(pair.similarity).toBeGreaterThanOrEqual(0.99);
    }
    store.close();
  });

  it('returns empty array for unknown article slug', () => {
    const store = new KnowledgeVectorStore(tmpDir);
    seedStore(store);

    const pairs = findArticleConflicts(store, 'nonexistent', 10);
    expect(pairs).toHaveLength(0);
    store.close();
  });

  it('respects topK limit', () => {
    const store = new KnowledgeVectorStore(tmpDir);
    seedStore(store);

    const pairs = findArticleConflicts(store, 'article-a', 1);
    expect(pairs.length).toBeLessThanOrEqual(1);
    store.close();
  });
});

describe('findQueryConflicts', () => {
  it('returns cross-article pairs from query results', () => {
    const store = new KnowledgeVectorStore(tmpDir);
    seedStore(store);

    // Query close to the "water boils" cluster
    const queryVec = makeEmbedding([0.97, 0.03, 0, 0]);
    const pairs = findQueryConflicts(store, queryVec, 10);

    expect(pairs.length).toBeGreaterThan(0);
    for (const pair of pairs) {
      expect(pair.a.article_slug).not.toBe(pair.b.article_slug);
    }
    store.close();
  });

  it('returns empty when all results are from the same article', () => {
    const store = new KnowledgeVectorStore(tmpDir);
    // Insert only from one article
    store.insertEntry({ text: 'Only one', contextual_text: 'Only one', type: 'sentence', source_url: null, article_slug: 'solo', section: '', source_score: 0, wiki: 'w', embedding: makeEmbedding([1, 0, 0, 0]) });
    store.insertEntry({ text: 'Only two', contextual_text: 'Only two', type: 'sentence', source_url: null, article_slug: 'solo', section: '', source_score: 0, wiki: 'w', embedding: makeEmbedding([0.99, 0.01, 0, 0]) });

    const pairs = findQueryConflicts(store, makeEmbedding([1, 0, 0, 0]), 10);
    expect(pairs).toHaveLength(0);
    store.close();
  });
});
