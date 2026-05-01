import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { cosineSimilarity } from './vector-utils.js';
import { KnowledgeVectorStore } from './knowledge-vector-store.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claim-store-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function vec(values: number[]): Float32Array {
  const arr = new Float32Array(768);
  for (let i = 0; i < values.length && i < 768; i++) arr[i] = values[i];
  return arr;
}

describe('cosineSimilarity (via vector-utils)', () => {
  test('returns 1.0 for identical vectors', () => {
    const a = vec([1, 2, 3]);
    expect(cosineSimilarity(a, a)).toBeCloseTo(1.0, 5);
  });

  test('returns 0.0 for orthogonal vectors', () => {
    const a = vec([1, 0, 0]);
    const b = vec([0, 1, 0]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.0, 5);
  });

  test('returns -1.0 for opposite vectors', () => {
    const a = vec([1, 0, 0]);
    const b = vec([-1, 0, 0]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0, 5);
  });
});

describe('KnowledgeVectorStore (claim backward compat)', () => {
  test('constructor creates knowledge.db', () => {
    const store = new KnowledgeVectorStore(tmpDir);
    expect(fs.existsSync(path.join(tmpDir, 'knowledge.db'))).toBe(true);
    store.close();
  });

  test('insertEntry with type=claim stores claim retrievable by id', () => {
    const store = new KnowledgeVectorStore(tmpDir);
    const embedding = vec([0.5, 0.3, 0.1]);

    const id = store.insertEntry({
      text: 'Water boils at 100°C',
      contextual_text: 'Water boils at 100°C',
      type: 'claim',
      source_url: 'https://example.com',
      article_slug: '',
      section: '',
      source_score: 0.8,
      wiki: 'test-wiki',
      embedding,
    });

    expect(id).toBeGreaterThan(0);
    const row = store.getById(id);
    expect(row).not.toBeNull();
    expect(row!.text).toBe('Water boils at 100°C');
    expect(row!.source_url).toBe('https://example.com');
    expect(row!.type).toBe('claim');
    store.close();
  });

  test('searchSimilar with type=claim returns ranked top-k results', () => {
    const store = new KnowledgeVectorStore(tmpDir);

    const closeVec = vec([1, 0, 0]);
    const farVec = vec([0, 1, 0]);
    const midVec = vec([0.7, 0.7, 0]);

    store.insertEntry({ text: 'close', contextual_text: 'close', type: 'claim', source_url: null, article_slug: '', section: '', source_score: 0, wiki: 'w', embedding: closeVec });
    store.insertEntry({ text: 'far', contextual_text: 'far', type: 'claim', source_url: null, article_slug: '', section: '', source_score: 0, wiki: 'w', embedding: farVec });
    store.insertEntry({ text: 'mid', contextual_text: 'mid', type: 'claim', source_url: null, article_slug: '', section: '', source_score: 0, wiki: 'w', embedding: midVec });

    const query = vec([1, 0, 0]);
    const results = store.searchSimilar(query, 2, 'claim');
    expect(results.length).toBe(2);
    expect(results[0].text).toBe('close');
    expect(results[1].text).toBe('mid');
    expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
    store.close();
  });

  test('db_allWithEmbeddings returns embeddings for dedup', () => {
    const store = new KnowledgeVectorStore(tmpDir);

    const v1 = vec([1, 0, 0]);
    const v2 = vec([0.99, 0.01, 0]);
    const v3 = vec([0, 1, 0]);

    store.insertEntry({ text: 'claim A', contextual_text: 'claim A', type: 'claim', source_url: null, article_slug: '', section: '', source_score: 0, wiki: 'w', embedding: v1 });
    store.insertEntry({ text: 'claim B', contextual_text: 'claim B', type: 'claim', source_url: null, article_slug: '', section: '', source_score: 0, wiki: 'w', embedding: v2 });
    store.insertEntry({ text: 'claim C', contextual_text: 'claim C', type: 'claim', source_url: null, article_slug: '', section: '', source_score: 0, wiki: 'w', embedding: v3 });

    const rows = store.db_allWithEmbeddings('claim');
    expect(rows).toHaveLength(3);

    const sim = cosineSimilarity(rows[0].embedding, rows[1].embedding);
    expect(sim).toBeGreaterThan(0.92);
    store.close();
  });
});
