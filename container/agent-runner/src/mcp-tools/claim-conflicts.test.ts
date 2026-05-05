import { describe, test, expect } from 'bun:test';
import { findSharedEvidence, detectStaleClaims, findClaimNliConflicts, handleClaimConflicts } from './claim-conflicts.js';
import type { ArticleClaims, StalenessCheckDeps, ClaimNliDeps } from './claim-conflicts.js';
import type { ClaimMeta } from './claim-linker.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('findSharedEvidence', () => {
  test('returns pairs of claims with overlapping sentence_ids from different articles', () => {
    const claims: ArticleClaims[] = [
      {
        articleSlug: 'article-a',
        claims: [
          { id: 'clm_aaa111', sentence_ids: [10, 20, 30], source_docs: [], nli_score: 0.9, verified_at: '2026-05-01' },
        ],
      },
      {
        articleSlug: 'article-b',
        claims: [
          { id: 'clm_bbb222', sentence_ids: [20, 30, 40], source_docs: [], nli_score: 0.8, verified_at: '2026-05-01' },
        ],
      },
    ];

    const result = findSharedEvidence(claims);
    expect(result).toHaveLength(1);
    expect(result[0].claimA.id).toBe('clm_aaa111');
    expect(result[0].claimB.id).toBe('clm_bbb222');
    expect(result[0].articleSlugA).toBe('article-a');
    expect(result[0].articleSlugB).toBe('article-b');
    expect(result[0].sharedIds).toEqual([20, 30]);
    expect(result[0].overlapCount).toBe(2);
  });

  test('returns empty for claims with disjoint sentence_ids', () => {
    const claims: ArticleClaims[] = [
      {
        articleSlug: 'article-a',
        claims: [
          { id: 'clm_aaa111', sentence_ids: [10, 20], source_docs: [], nli_score: 0.9, verified_at: '2026-05-01' },
        ],
      },
      {
        articleSlug: 'article-b',
        claims: [
          { id: 'clm_bbb222', sentence_ids: [30, 40], source_docs: [], nli_score: 0.8, verified_at: '2026-05-01' },
        ],
      },
    ];

    expect(findSharedEvidence(claims)).toEqual([]);
  });

  test('excludes claim pairs from the same article', () => {
    const claims: ArticleClaims[] = [
      {
        articleSlug: 'article-a',
        claims: [
          { id: 'clm_aaa111', sentence_ids: [10, 20], source_docs: [], nli_score: 0.9, verified_at: '2026-05-01' },
          { id: 'clm_aaa222', sentence_ids: [20, 30], source_docs: [], nli_score: 0.8, verified_at: '2026-05-01' },
        ],
      },
    ];

    expect(findSharedEvidence(claims)).toEqual([]);
  });

  test('handles claims with empty sentence_ids gracefully', () => {
    const claims: ArticleClaims[] = [
      {
        articleSlug: 'article-a',
        claims: [
          { id: 'clm_aaa111', sentence_ids: [], source_docs: [], nli_score: null, verified_at: null },
        ],
      },
      {
        articleSlug: 'article-b',
        claims: [
          { id: 'clm_bbb222', sentence_ids: [10], source_docs: [], nli_score: 0.8, verified_at: '2026-05-01' },
        ],
      },
    ];

    expect(findSharedEvidence(claims)).toEqual([]);
  });

  test('sorts results by overlap count descending', () => {
    const claims: ArticleClaims[] = [
      {
        articleSlug: 'article-a',
        claims: [
          { id: 'clm_a1', sentence_ids: [10, 20, 30, 40], source_docs: [], nli_score: 0.9, verified_at: '2026-05-01' },
          { id: 'clm_a2', sentence_ids: [50, 60], source_docs: [], nli_score: 0.9, verified_at: '2026-05-01' },
        ],
      },
      {
        articleSlug: 'article-b',
        claims: [
          { id: 'clm_b1', sentence_ids: [10, 20, 30], source_docs: [], nli_score: 0.8, verified_at: '2026-05-01' },
          { id: 'clm_b2', sentence_ids: [50], source_docs: [], nli_score: 0.8, verified_at: '2026-05-01' },
        ],
      },
    ];

    const result = findSharedEvidence(claims);
    expect(result).toHaveLength(2);
    expect(result[0].overlapCount).toBe(3);
    expect(result[1].overlapCount).toBe(1);
  });
});

describe('detectStaleClaims', () => {
  function makeDeps(opts: {
    sentenceExists?: Map<number, boolean>;
    fileMtimes?: Map<string, Date>;
  }): StalenessCheckDeps {
    return {
      sentenceExists: (id: number) => opts.sentenceExists?.get(id) ?? true,
      getSourceFileMtime: (doc: string) => opts.fileMtimes?.get(doc) ?? null,
    };
  }

  test('flags claims where source_docs file mtime is after verified_at', () => {
    const claims: ClaimMeta[] = [
      { id: 'clm_stale1', sentence_ids: [10], source_docs: ['doc1.md'], nli_score: 0.9, verified_at: '2026-05-01' },
    ];

    const deps = makeDeps({
      fileMtimes: new Map([['doc1.md', new Date('2026-05-03')]]),
    });

    const result = detectStaleClaims(claims, deps);
    expect(result).toHaveLength(1);
    expect(result[0].claimId).toBe('clm_stale1');
    expect(result[0].reason).toBe('evidence_updated');
    expect(result[0].details).toContain('doc1.md');
  });

  test('detects orphaned sentence_ids not in knowledge.db', () => {
    const claims: ClaimMeta[] = [
      { id: 'clm_orphan1', sentence_ids: [10, 20, 30], source_docs: [], nli_score: 0.9, verified_at: '2026-05-01' },
    ];

    const deps = makeDeps({
      sentenceExists: new Map([[10, true], [20, false], [30, false]]),
    });

    const result = detectStaleClaims(claims, deps);
    expect(result).toHaveLength(1);
    expect(result[0].claimId).toBe('clm_orphan1');
    expect(result[0].reason).toBe('orphaned_ids');
    expect(result[0].orphanedIds).toEqual([20, 30]);
  });

  test('returns empty for claims with all-fresh sources and valid sentence_ids', () => {
    const claims: ClaimMeta[] = [
      { id: 'clm_fresh1', sentence_ids: [10, 20], source_docs: ['doc1.md'], nli_score: 0.9, verified_at: '2026-05-05' },
    ];

    const deps = makeDeps({
      sentenceExists: new Map([[10, true], [20, true]]),
      fileMtimes: new Map([['doc1.md', new Date('2026-05-01')]]),
    });

    expect(detectStaleClaims(claims, deps)).toEqual([]);
  });

  test('skips claims with null verified_at', () => {
    const claims: ClaimMeta[] = [
      { id: 'clm_unverified', sentence_ids: [10], source_docs: ['doc1.md'], nli_score: null, verified_at: null },
    ];

    const deps = makeDeps({
      fileMtimes: new Map([['doc1.md', new Date('2026-06-01')]]),
    });

    expect(detectStaleClaims(claims, deps)).toEqual([]);
  });

  test('reports both stale and orphaned for same claim', () => {
    const claims: ClaimMeta[] = [
      { id: 'clm_both', sentence_ids: [10, 20], source_docs: ['doc1.md'], nli_score: 0.8, verified_at: '2026-05-01' },
    ];

    const deps = makeDeps({
      sentenceExists: new Map([[10, true], [20, false]]),
      fileMtimes: new Map([['doc1.md', new Date('2026-05-10')]]),
    });

    const result = detectStaleClaims(claims, deps);
    expect(result).toHaveLength(2);
    const reasons = result.map((r) => r.reason).sort();
    expect(reasons).toEqual(['evidence_updated', 'orphaned_ids']);
  });
});

describe('findClaimNliConflicts', () => {
  function makeEmbedFn(embeddings: Map<string, Float32Array>): (text: string) => Promise<Float32Array | null> {
    return async (text: string) => embeddings.get(text) ?? null;
  }

  function makeSimilarVec(base: Float32Array, noise: number): Float32Array {
    const vec = new Float32Array(base.length);
    for (let i = 0; i < base.length; i++) {
      vec[i] = base[i] + (Math.random() - 0.5) * noise;
    }
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    for (let i = 0; i < vec.length; i++) vec[i] /= norm;
    return vec;
  }

  function makeUnitVec(dims: number, dominant: number): Float32Array {
    const vec = new Float32Array(dims);
    vec[dominant] = 1.0;
    return vec;
  }

  test('returns classified claim pairs from different articles above threshold', async () => {
    const vecA = makeUnitVec(8, 0);
    const vecB = makeSimilarVec(vecA, 0.01);

    const articleClaims: ArticleClaims[] = [
      {
        articleSlug: 'article-a',
        claims: [{ id: 'clm_a1', sentence_ids: [10], source_docs: [], nli_score: 0.9, verified_at: '2026-05-01' }],
      },
      {
        articleSlug: 'article-b',
        claims: [{ id: 'clm_b1', sentence_ids: [20], source_docs: [], nli_score: 0.8, verified_at: '2026-05-01' }],
      },
    ];

    const claimTexts = new Map([
      ['article-a', [{ id: 'clm_a1', text: 'Claim A text', section: '' }]],
      ['article-b', [{ id: 'clm_b1', text: 'Claim B text', section: '' }]],
    ]);

    const embeddings = new Map([
      ['Claim A text', vecA],
      ['Claim B text', vecB],
    ]);

    const deps: ClaimNliDeps = {
      embedFn: makeEmbedFn(embeddings),
      classifyFn: async (pairs) => pairs.map((p) => ({ ...p, classification: 'contradict' as const, explanation: 'test' })),
      getClaimTexts: (slug) => claimTexts.get(slug) ?? [],
    };

    const result = await findClaimNliConflicts(articleClaims, deps, { threshold: 0.5 });
    expect(result).toHaveLength(1);
    expect(result[0].classification).toBe('contradict');
    expect(result[0].a.article_slug).toBe('article-a');
    expect(result[0].b.article_slug).toBe('article-b');
  });

  test('filters by cosine threshold', async () => {
    const vecA = makeUnitVec(8, 0);
    const vecB = makeUnitVec(8, 4);

    const articleClaims: ArticleClaims[] = [
      { articleSlug: 'article-a', claims: [{ id: 'clm_a1', sentence_ids: [10], source_docs: [], nli_score: 0.9, verified_at: '2026-05-01' }] },
      { articleSlug: 'article-b', claims: [{ id: 'clm_b1', sentence_ids: [20], source_docs: [], nli_score: 0.8, verified_at: '2026-05-01' }] },
    ];

    const claimTexts = new Map([
      ['article-a', [{ id: 'clm_a1', text: 'Claim A', section: '' }]],
      ['article-b', [{ id: 'clm_b1', text: 'Claim B', section: '' }]],
    ]);

    const deps: ClaimNliDeps = {
      embedFn: makeEmbedFn(new Map([['Claim A', vecA], ['Claim B', vecB]])),
      classifyFn: async (pairs) => pairs.map((p) => ({ ...p, classification: 'agree' as const, explanation: 'test' })),
      getClaimTexts: (slug) => claimTexts.get(slug) ?? [],
    };

    const result = await findClaimNliConflicts(articleClaims, deps, { threshold: 0.7 });
    expect(result).toEqual([]);
  });

  test('excludes same-article pairs', async () => {
    const vec = makeUnitVec(8, 0);

    const articleClaims: ArticleClaims[] = [
      {
        articleSlug: 'article-a',
        claims: [
          { id: 'clm_a1', sentence_ids: [10], source_docs: [], nli_score: 0.9, verified_at: '2026-05-01' },
          { id: 'clm_a2', sentence_ids: [20], source_docs: [], nli_score: 0.9, verified_at: '2026-05-01' },
        ],
      },
    ];

    const claimTexts = new Map([
      ['article-a', [
        { id: 'clm_a1', text: 'Claim A1', section: '' },
        { id: 'clm_a2', text: 'Claim A2', section: '' },
      ]],
    ]);

    const deps: ClaimNliDeps = {
      embedFn: makeEmbedFn(new Map([['Claim A1', vec], ['Claim A2', vec]])),
      classifyFn: async (pairs) => pairs.map((p) => ({ ...p, classification: 'agree' as const, explanation: 'test' })),
      getClaimTexts: (slug) => claimTexts.get(slug) ?? [],
    };

    const result = await findClaimNliConflicts(articleClaims, deps, { threshold: 0.5 });
    expect(result).toEqual([]);
  });

  test('returns empty when no pairs exceed threshold', async () => {
    const articleClaims: ArticleClaims[] = [
      { articleSlug: 'article-a', claims: [{ id: 'clm_a1', sentence_ids: [], source_docs: [], nli_score: null, verified_at: null }] },
    ];

    const deps: ClaimNliDeps = {
      embedFn: async () => null,
      classifyFn: async (pairs) => pairs.map((p) => ({ ...p })),
      getClaimTexts: () => [],
    };

    const result = await findClaimNliConflicts(articleClaims, deps);
    expect(result).toEqual([]);
  });
});

describe('handleClaimConflicts', () => {
  let tmpDir: string;

  function setupWiki(articles: Record<string, string>): string {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claim-conflicts-test-'));
    const articlesDir = path.join(tmpDir, 'articles');
    const conceptsDir = path.join(articlesDir, 'concepts');
    fs.mkdirSync(conceptsDir, { recursive: true });
    for (const [name, content] of Object.entries(articles)) {
      fs.writeFileSync(path.join(conceptsDir, name), content);
    }
    return tmpDir;
  }

  function cleanupWiki() {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  test('returns structured report for article with claims', async () => {
    const wikiPath = setupWiki({
      'test-article.md': `---
title: Test Article
claims:
  - id: clm_aaa111
    sentence_ids: [10, 20]
    source_docs: []
    nli_score: 0.9
    verified_at: 2026-05-01
---

# Test Article

## Overview

Some claim text here.[[clm_aaa111]]
`,
    });

    try {
      const result = await handleClaimConflicts({ wiki: '__test__', article_slug: 'test-article', skip_nli: true }, wikiPath);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty('shared_evidence');
      expect(parsed).toHaveProperty('staleness');
      expect(parsed).toHaveProperty('nli_conflicts');
      expect(parsed.shared_evidence).toEqual([]);
      expect(parsed.nli_conflicts).toEqual([]);
    } finally {
      cleanupWiki();
    }
  });

  test('requires wiki parameter', async () => {
    const result = await handleClaimConflicts({});
    expect(result.content[0].text).toContain('Error');
  });

  test('returns empty report when no claims exist', async () => {
    const wikiPath = setupWiki({
      'no-claims.md': `---
title: No Claims
---

# No Claims

Body text.
`,
    });

    try {
      const result = await handleClaimConflicts({ wiki: '__test__', article_slug: 'no-claims', skip_nli: true }, wikiPath);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.shared_evidence).toEqual([]);
      expect(parsed.staleness).toEqual([]);
      expect(parsed.nli_conflicts).toEqual([]);
    } finally {
      cleanupWiki();
    }
  });
});
