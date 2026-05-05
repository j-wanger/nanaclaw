import { describe, test, expect } from 'bun:test';
import { reconcileArticle, handleClaimReconcile } from './claim-reconcile.js';
import type { ReconcileOptions, ReconcileResult } from './claim-reconcile.js';
import type { StalenessCheckDeps } from './claim-conflicts.js';
import type { LinkOptions, LinkResult } from './claim-linker.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const ARTICLE_WITH_STALE_CLAIM = `---
title: Test Article
claims:
  - id: clm_aaa111
    sentence_ids: [10, 20]
    source_docs: ['source-a.md']
    nli_score: 0.85
    verified_at: 2026-04-01
  - id: clm_bbb222
    sentence_ids: [30]
    source_docs: ['source-b.md']
    nli_score: 0.9
    verified_at: 2026-05-01
---

# Test Article

## Content

Some claim text here.[[clm_aaa111]]

Another claim sentence.[[clm_bbb222]]
`;

const ARTICLE_NO_CLAIMS = `---
title: No Claims
---

# No Claims

Just a regular article.
`;

const ARTICLE_UNLINKED_CLAIMS = `---
title: Unlinked
claims:
  - id: clm_ccc333
    sentence_ids: []
    source_docs: []
    nli_score: null
    verified_at: null
---

# Unlinked

A claim without links.[[clm_ccc333]]
`;

function makeStaleDeps(opts: { staleDoc?: string; orphanedIds?: number[] }): StalenessCheckDeps {
  return {
    sentenceExists: (id: number) => !(opts.orphanedIds ?? []).includes(id),
    getSourceFileMtime: (doc: string) => {
      if (doc === opts.staleDoc) return new Date('2026-05-03');
      return new Date('2026-03-01');
    },
  };
}

function makeLinkOptions(overrides?: Partial<LinkOptions>): LinkOptions {
  return {
    store: { searchSimilar: () => [], close: () => {}, getById: () => null } as any,
    embedFn: async () => new Float32Array(768),
    nliFn: async () => ({ terminationReason: 'complete' as const, output: '', iterations: 1 }),
    skipNli: true,
    ...overrides,
  };
}

describe('reconcileArticle', () => {
  test('detects stale claims and returns reconciled content', async () => {
    const staleDeps = makeStaleDeps({ staleDoc: 'source-a.md' });
    const linkOpts = makeLinkOptions();

    const result = await reconcileArticle(ARTICLE_WITH_STALE_CLAIM, 'test-article', {
      staleDeps,
      linkOptions: linkOpts,
    });

    expect(result.staleClaims).toHaveLength(1);
    expect(result.staleClaims[0].claimId).toBe('clm_aaa111');
    expect(result.staleClaims[0].reason).toBe('evidence_updated');
    expect(result.orphanedClaims).toHaveLength(0);
  });

  test('detects orphaned claims and clears them for re-linking', async () => {
    const staleDeps = makeStaleDeps({ orphanedIds: [10, 20] });
    const linkOpts = makeLinkOptions();

    const result = await reconcileArticle(ARTICLE_WITH_STALE_CLAIM, 'test-article', {
      staleDeps,
      linkOptions: linkOpts,
    });

    expect(result.orphanedClaims).toHaveLength(1);
    expect(result.orphanedClaims[0].claimId).toBe('clm_aaa111');
    expect(result.orphanedClaims[0].reason).toBe('orphaned_ids');
  });

  test('returns unchanged content for non-stale article', async () => {
    const staleDeps = makeStaleDeps({});
    const linkOpts = makeLinkOptions();

    const result = await reconcileArticle(ARTICLE_WITH_STALE_CLAIM, 'test-article', {
      staleDeps,
      linkOptions: linkOpts,
    });

    expect(result.staleClaims).toHaveLength(0);
    expect(result.orphanedClaims).toHaveLength(0);
    expect(result.reconciled).toBe(false);
    expect(result.updatedContent).toBe(ARTICLE_WITH_STALE_CLAIM);
  });

  test('returns unchanged for articles with no claims', async () => {
    const staleDeps = makeStaleDeps({});
    const linkOpts = makeLinkOptions();

    const result = await reconcileArticle(ARTICLE_NO_CLAIMS, 'no-claims', {
      staleDeps,
      linkOptions: linkOpts,
    });

    expect(result.staleClaims).toHaveLength(0);
    expect(result.orphanedClaims).toHaveLength(0);
    expect(result.reconciled).toBe(false);
  });

  test('skips unlinked claims (no verified_at, cannot be stale)', async () => {
    const staleDeps = makeStaleDeps({});
    const linkOpts = makeLinkOptions();

    const result = await reconcileArticle(ARTICLE_UNLINKED_CLAIMS, 'unlinked', {
      staleDeps,
      linkOptions: linkOpts,
    });

    expect(result.staleClaims).toHaveLength(0);
    expect(result.orphanedClaims).toHaveLength(0);
    expect(result.reconciled).toBe(false);
  });

  test('clears stale claims in-memory before re-linking (atomic)', async () => {
    let contentPassedToLinker = '';
    const staleDeps = makeStaleDeps({ staleDoc: 'source-a.md' });
    const linkOpts = makeLinkOptions({
      store: {
        searchSimilar: () => [],
        close: () => {},
        getById: () => null,
      } as any,
      embedFn: async () => new Float32Array(768),
      nliFn: async (prompt: string) => {
        return { terminationReason: 'complete' as const, output: '', iterations: 1 };
      },
    });

    const result = await reconcileArticle(ARTICLE_WITH_STALE_CLAIM, 'test-article', {
      staleDeps,
      linkOptions: linkOpts,
      onBeforeRelink: (cleared) => { contentPassedToLinker = cleared; },
    });

    expect(result.reconciled).toBe(true);
    // The cleared content should have empty sentence_ids for the stale claim
    expect(contentPassedToLinker).toContain('sentence_ids: []');
    // But the non-stale claim should retain its data in the cleared version
    expect(contentPassedToLinker).toContain("sentence_ids: [30]");
  });

  test('handles both stale and orphaned in same article', async () => {
    const staleDeps: StalenessCheckDeps = {
      sentenceExists: (id: number) => id !== 30,
      getSourceFileMtime: (doc: string) => {
        if (doc === 'source-a.md') return new Date('2026-05-03');
        return new Date('2026-03-01');
      },
    };
    const linkOpts = makeLinkOptions();

    const result = await reconcileArticle(ARTICLE_WITH_STALE_CLAIM, 'test-article', {
      staleDeps,
      linkOptions: linkOpts,
    });

    expect(result.staleClaims).toHaveLength(1);
    expect(result.staleClaims[0].claimId).toBe('clm_aaa111');
    expect(result.orphanedClaims).toHaveLength(1);
    expect(result.orphanedClaims[0].claimId).toBe('clm_bbb222');
    expect(result.reconciled).toBe(true);
  });
});

describe('handleClaimReconcile', () => {
  let tmpDir: string;

  function setupWiki(articles: Record<string, string>): string {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reconcile-test-'));
    const wikiPath = tmpDir;
    const articlesDir = path.join(wikiPath, 'articles', 'concepts');
    fs.mkdirSync(articlesDir, { recursive: true });

    const rawDir = path.join(wikiPath, 'raw', 'articles');
    fs.mkdirSync(rawDir, { recursive: true });

    for (const [slug, content] of Object.entries(articles)) {
      fs.writeFileSync(path.join(articlesDir, `${slug}.md`), content);
    }

    // Write wikis.json pointing to our tmp wiki
    const wikisPath = path.join(tmpDir, 'wikis.json');
    fs.writeFileSync(wikisPath, JSON.stringify({ wikis: [{ name: 'test-wiki', path: wikiPath, description: 'test' }] }));
    process.env.WIKIS_JSON_PATH = wikisPath;

    return wikiPath;
  }

  test('dry_run returns report without modifying files', async () => {
    const wikiPath = setupWiki({ 'stale-article': ARTICLE_WITH_STALE_CLAIM });

    // Create a stale raw source file (mtime after verified_at)
    const rawPath = path.join(wikiPath, 'raw', 'articles', 'source-a.md');
    fs.writeFileSync(rawPath, '# Source A\nUpdated content');
    const futureDate = new Date('2026-05-03');
    fs.utimesSync(rawPath, futureDate, futureDate);

    const result = await handleClaimReconcile({ wiki: 'test-wiki', dry_run: true }, wikiPath);
    const text = (result.content[0] as any).text;
    const report = JSON.parse(text);

    expect(report.articles_scanned).toBeGreaterThan(0);
    // File should NOT be modified in dry_run
    const fileContent = fs.readFileSync(path.join(wikiPath, 'articles', 'concepts', 'stale-article.md'), 'utf8');
    expect(fileContent).toBe(ARTICLE_WITH_STALE_CLAIM);

    fs.rmSync(tmpDir, { recursive: true });
  });

  test('handler returns structured JSON report', async () => {
    const wikiPath = setupWiki({ 'clean-article': ARTICLE_WITH_STALE_CLAIM });

    // All sources are old (not stale)
    const rawPath = path.join(wikiPath, 'raw', 'articles', 'source-a.md');
    fs.writeFileSync(rawPath, '# Source A');
    const oldDate = new Date('2026-03-01');
    fs.utimesSync(rawPath, oldDate, oldDate);

    const result = await handleClaimReconcile({ wiki: 'test-wiki' }, wikiPath);
    const text = (result.content[0] as any).text;
    const report = JSON.parse(text);

    expect(report).toHaveProperty('articles_scanned');
    expect(report).toHaveProperty('articles_reconciled');
    expect(report).toHaveProperty('total_stale');
    expect(report).toHaveProperty('total_orphaned');
    expect(report.articles_reconciled).toBe(0);

    fs.rmSync(tmpDir, { recursive: true });
  });

  test('wiki parameter required', async () => {
    const result = await handleClaimReconcile({});
    const text = (result.content[0] as any).text;
    expect(text).toContain('Error');
  });
});
