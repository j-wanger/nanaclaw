import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';

import { KnowledgeVectorStore } from './knowledge-vector-store.js';
import { discoverClaimsInArticle } from './knowledge-discovery.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'discovery-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function makeEmbedding(values: number[]): Float32Array {
  return new Float32Array(values);
}

describe('discoverClaimsInArticle', () => {
  it('returns unclaimed sentences ranked by max similarity to any claim', () => {
    const store = new KnowledgeVectorStore(tmpDir);

    // Existing claims (from other articles)
    store.insertEntry({ text: 'CEO was convicted of fraud.', contextual_text: 'C1', type: 'claim', source_url: null, article_slug: 'other', section: '', source_score: 0.9, wiki: 'w', embedding: makeEmbedding([1, 0, 0, 0]) });
    store.insertEntry({ text: 'Company fined $10M.', contextual_text: 'C2', type: 'claim', source_url: null, article_slug: 'other', section: '', source_score: 0.8, wiki: 'w', embedding: makeEmbedding([0, 1, 0, 0]) });

    // Article sentences — some claim-like, some not
    store.insertEntry({ text: 'The director was found guilty of embezzlement.', contextual_text: 'S1', type: 'sentence', source_url: null, article_slug: 'target', section: 'Findings', source_score: 0, wiki: 'w', embedding: makeEmbedding([0.95, 0.05, 0, 0]) }); // very similar to claim 1
    store.insertEntry({ text: 'This article discusses financial crime.', contextual_text: 'S2', type: 'sentence', source_url: null, article_slug: 'target', section: 'Intro', source_score: 0, wiki: 'w', embedding: makeEmbedding([0.3, 0.3, 0.5, 0]) }); // dissimilar to claims
    store.insertEntry({ text: 'The firm paid a $5M settlement.', contextual_text: 'S3', type: 'sentence', source_url: null, article_slug: 'target', section: 'Outcome', source_score: 0, wiki: 'w', embedding: makeEmbedding([0.1, 0.9, 0, 0]) }); // similar to claim 2

    const candidates = discoverClaimsInArticle(store, 'target', 10);
    expect(candidates.length).toBe(3);

    // Sorted descending by similarity — most claim-like first
    expect(candidates[0].similarity).toBeGreaterThanOrEqual(candidates[1].similarity);
    expect(candidates[1].similarity).toBeGreaterThanOrEqual(candidates[2].similarity);

    // Each candidate has nearestClaim text
    for (const c of candidates) {
      expect(c.nearestClaim).toBeTruthy();
    }
    store.close();
  });

  it('excludes entries already typed as claim', () => {
    const store = new KnowledgeVectorStore(tmpDir);

    store.insertEntry({ text: 'Existing claim in target.', contextual_text: 'C', type: 'claim', source_url: null, article_slug: 'target', section: '', source_score: 0.9, wiki: 'w', embedding: makeEmbedding([1, 0, 0, 0]) });
    store.insertEntry({ text: 'A sentence in target.', contextual_text: 'S', type: 'sentence', source_url: null, article_slug: 'target', section: '', source_score: 0, wiki: 'w', embedding: makeEmbedding([0.5, 0.5, 0, 0]) });

    // Need at least one claim to compare against
    store.insertEntry({ text: 'Reference claim.', contextual_text: 'RC', type: 'claim', source_url: null, article_slug: 'other', section: '', source_score: 0.5, wiki: 'w', embedding: makeEmbedding([0.4, 0.6, 0, 0]) });

    const candidates = discoverClaimsInArticle(store, 'target', 10);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].text).toBe('A sentence in target.');
    store.close();
  });

  it('respects minSimilarity threshold', () => {
    const store = new KnowledgeVectorStore(tmpDir);

    store.insertEntry({ text: 'A claim.', contextual_text: 'C', type: 'claim', source_url: null, article_slug: 'ref', section: '', source_score: 0.9, wiki: 'w', embedding: makeEmbedding([1, 0, 0, 0]) });
    store.insertEntry({ text: 'Similar sentence.', contextual_text: 'S1', type: 'sentence', source_url: null, article_slug: 'target', section: '', source_score: 0, wiki: 'w', embedding: makeEmbedding([0.99, 0.01, 0, 0]) });
    store.insertEntry({ text: 'Dissimilar sentence.', contextual_text: 'S2', type: 'sentence', source_url: null, article_slug: 'target', section: '', source_score: 0, wiki: 'w', embedding: makeEmbedding([0, 0, 1, 0]) });

    const highThreshold = discoverClaimsInArticle(store, 'target', 10, 0.9);
    const lowThreshold = discoverClaimsInArticle(store, 'target', 10, 0.0);

    expect(lowThreshold.length).toBeGreaterThanOrEqual(highThreshold.length);
    for (const c of highThreshold) {
      expect(c.similarity).toBeGreaterThanOrEqual(0.9);
    }
    store.close();
  });

  it('returns empty when no claims exist', () => {
    const store = new KnowledgeVectorStore(tmpDir);

    store.insertEntry({ text: 'A sentence.', contextual_text: 'S', type: 'sentence', source_url: null, article_slug: 'target', section: '', source_score: 0, wiki: 'w', embedding: makeEmbedding([1, 0, 0, 0]) });

    const candidates = discoverClaimsInArticle(store, 'target', 10);
    expect(candidates).toHaveLength(0);
    store.close();
  });

  it('returns empty for unknown article slug', () => {
    const store = new KnowledgeVectorStore(tmpDir);
    const candidates = discoverClaimsInArticle(store, 'nonexistent', 10);
    expect(candidates).toHaveLength(0);
    store.close();
  });

  it('respects topK limit', () => {
    const store = new KnowledgeVectorStore(tmpDir);

    store.insertEntry({ text: 'Claim.', contextual_text: 'C', type: 'claim', source_url: null, article_slug: 'ref', section: '', source_score: 0.9, wiki: 'w', embedding: makeEmbedding([1, 0, 0, 0]) });

    for (let i = 0; i < 5; i++) {
      store.insertEntry({ text: `Sent ${i}`, contextual_text: `S${i}`, type: 'sentence', source_url: null, article_slug: 'target', section: '', source_score: 0, wiki: 'w', embedding: makeEmbedding([0.9 - i * 0.1, 0.1 + i * 0.1, 0, 0]) });
    }

    const candidates = discoverClaimsInArticle(store, 'target', 2);
    expect(candidates).toHaveLength(2);
    store.close();
  });
});
