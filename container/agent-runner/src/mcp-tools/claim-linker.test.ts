import { describe, test, expect, mock } from 'bun:test';
import { parseClaimMarkers, buildNliPrompt, parseNliResults, updateClaimsFrontmatter, matchClaimToSentences, linkArticleClaims, parseClaimMetadata } from './claim-linker.js';

import type { NliPair, ClaimUpdate, ClaimMeta } from './claim-linker.js';

describe('parseClaimMarkers', () => {
  test('returns empty array for article with no markers', () => {
    const content = `---
title: No Claims
---

# No Claims

This article has no claim markers at all.

## Section One

Just plain text here.
`;
    expect(parseClaimMarkers(content)).toEqual([]);
  });

  test('extracts single marker with preceding sentence', () => {
    const content = `---
title: Test Article
claims:
  - id: clm_abc123
    sentence_ids: []
---

# Test Article

## Overview

Trade-based money laundering exploits international trade to move value across borders.[[clm_abc123]]
`;
    const result = parseClaimMarkers(content);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('clm_abc123');
    expect(result[0].text).toBe('Trade-based money laundering exploits international trade to move value across borders.');
    expect(result[0].section).toBe('Overview');
  });

  test('extracts multiple markers across sections', () => {
    const content = `---
title: Multi Section
claims:
  - id: clm_aaa111
    sentence_ids: []
  - id: clm_bbb222
    sentence_ids: []
  - id: clm_ccc333
    sentence_ids: []
---

# Multi Section

## Background

Shell companies are commonly used to layer illicit funds.[[clm_aaa111]]

Some transitional text here.

## Methods

Criminals exploit trade mispricing to transfer value across borders.[[clm_bbb222]]

## Impact

Regulatory fines have increased 300% since 2020.[[clm_ccc333]]
`;
    const result = parseClaimMarkers(content);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ id: 'clm_aaa111', text: 'Shell companies are commonly used to layer illicit funds.', section: 'Background' });
    expect(result[1]).toEqual({ id: 'clm_bbb222', text: 'Criminals exploit trade mispricing to transfer value across borders.', section: 'Methods' });
    expect(result[2]).toEqual({ id: 'clm_ccc333', text: 'Regulatory fines have increased 300% since 2020.', section: 'Impact' });
  });

  test('handles consecutive markers on adjacent sentences', () => {
    const content = `---
title: Consecutive
claims:
  - id: clm_111aaa
    sentence_ids: []
  - id: clm_222bbb
    sentence_ids: []
---

# Consecutive

## Facts

First factual statement here.[[clm_111aaa]]
Second factual statement follows.[[clm_222bbb]]
`;
    const result = parseClaimMarkers(content);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('First factual statement here.');
    expect(result[1].text).toBe('Second factual statement follows.');
  });

  test('handles marker at end of paragraph with no trailing newline', () => {
    const content = `---
title: Edge
claims:
  - id: clm_edge01
    sentence_ids: []
---

# Edge

## Section

A sentence before a paragraph break.[[clm_edge01]]

Next paragraph starts here.`;
    const result = parseClaimMarkers(content);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('A sentence before a paragraph break.');
  });

  test('uses empty string for section when no heading found', () => {
    const content = `---
title: No Sections
claims:
  - id: clm_nosec1
    sentence_ids: []
---

A claim with no section heading.[[clm_nosec1]]
`;
    const result = parseClaimMarkers(content);
    expect(result).toHaveLength(1);
    expect(result[0].section).toBe('');
  });

  test('ignores markers inside frontmatter', () => {
    const content = `---
title: Test
claims:
  - id: clm_fm0001
    sentence_ids: []
---

# Test

## Body

Real claim in the body.[[clm_fm0001]]
`;
    const result = parseClaimMarkers(content);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Real claim in the body.');
  });
});

describe('nli prompt and parser', () => {
  const pairs: NliPair[] = [
    { claimText: 'Shell companies hide beneficial ownership.', sentenceText: 'Shell entities obscure the true owners of funds.', sentenceId: 1 },
    { claimText: 'FATF guidelines require enhanced due diligence.', sentenceText: 'Banks must verify customer identity under KYC rules.', sentenceId: 2 },
  ];

  test('buildNliPrompt produces numbered pairs', () => {
    const prompt = buildNliPrompt(pairs);
    expect(prompt).toContain('PAIR 1:');
    expect(prompt).toContain('PAIR 2:');
    expect(prompt).toContain('CLAIM: Shell companies hide beneficial ownership.');
    expect(prompt).toContain('EVIDENCE: Shell entities obscure the true owners of funds.');
    expect(prompt).toContain('ENTAILS');
    expect(prompt).toContain('NEUTRAL');
    expect(prompt).toContain('CONTRADICTS');
    expect(prompt).toContain('[NLI pair=');
  });

  test('parseNliResults extracts labels and scores', () => {
    const output = `[NLI pair=1] ENTAILS | The evidence directly supports the claim about shell companies.
[NLI pair=2] NEUTRAL | KYC is related but doesn't specifically address FATF EDD requirements.`;

    const results = parseNliResults(output);
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      pair: 1,
      label: 'entails',
      score: 1.0,
      explanation: 'The evidence directly supports the claim about shell companies.',
    });
    expect(results[1]).toEqual({
      pair: 2,
      label: 'neutral',
      score: 0.5,
      explanation: "KYC is related but doesn't specifically address FATF EDD requirements.",
    });
  });

  test('parseNliResults handles CONTRADICTS label', () => {
    const output = `[NLI pair=1] CONTRADICTS | The evidence states the opposite of the claim.`;
    const results = parseNliResults(output);
    expect(results).toHaveLength(1);
    expect(results[0].label).toBe('contradicts');
    expect(results[0].score).toBe(0.0);
  });

  test('parseNliResults returns empty array for malformed output', () => {
    const output = 'This is not a valid NLI output format.';
    expect(parseNliResults(output)).toEqual([]);
  });

  test('parseNliResults handles mixed valid and invalid lines', () => {
    const output = `Some preamble text
[NLI pair=1] ENTAILS | Valid result
Invalid middle line
[NLI pair=3] NEUTRAL | Another valid result`;
    const results = parseNliResults(output);
    expect(results).toHaveLength(2);
    expect(results[0].pair).toBe(1);
    expect(results[1].pair).toBe(3);
  });
});

describe('updateClaimsFrontmatter', () => {
  const baseArticle = `---
title: Test Article
tags: [aml, compliance]
claims:
  - id: clm_aaa111
    sentence_ids: []
    source_docs: []
    verified_at: null
    nli_score: null
  - id: clm_bbb222
    sentence_ids: []
    source_docs: []
    verified_at: null
    nli_score: null
  - id: clm_ccc333
    sentence_ids: []
    source_docs: []
    verified_at: null
    nli_score: null
---

# Test Article

## Content

Some body text here.`;

  test('updates sentence_ids and nli_score for a single claim', () => {
    const updates: ClaimUpdate[] = [
      { id: 'clm_aaa111', sentence_ids: [42, 87], source_docs: ['raw-doc-1.md'], nli_score: 0.85, verified_at: '2026-05-04' },
    ];
    const result = updateClaimsFrontmatter(baseArticle, updates);
    expect(result).toContain('sentence_ids: [42, 87]');
    expect(result).toContain("source_docs: ['raw-doc-1.md']");
    expect(result).toContain('nli_score: 0.85');
    expect(result).toContain('verified_at: 2026-05-04');
    // Other claims unchanged
    expect(result).toContain('  - id: clm_bbb222\n    sentence_ids: []\n    source_docs: []');
  });

  test('updates multiple claims', () => {
    const updates: ClaimUpdate[] = [
      { id: 'clm_aaa111', sentence_ids: [10], source_docs: ['a.md'], nli_score: 1.0, verified_at: '2026-05-04' },
      { id: 'clm_ccc333', sentence_ids: [20, 30], source_docs: ['b.md', 'c.md'], nli_score: 0.75, verified_at: '2026-05-04' },
    ];
    const result = updateClaimsFrontmatter(baseArticle, updates);
    expect(result).toContain('  - id: clm_aaa111\n    sentence_ids: [10]');
    expect(result).toContain('  - id: clm_ccc333\n    sentence_ids: [20, 30]');
    // Middle claim unchanged
    expect(result).toContain('  - id: clm_bbb222\n    sentence_ids: []');
  });

  test('preserves other frontmatter fields', () => {
    const updates: ClaimUpdate[] = [
      { id: 'clm_aaa111', sentence_ids: [1], source_docs: [], nli_score: 0.5, verified_at: '2026-05-04' },
    ];
    const result = updateClaimsFrontmatter(baseArticle, updates);
    expect(result).toContain('title: Test Article');
    expect(result).toContain('tags: [aml, compliance]');
  });

  test('preserves body content', () => {
    const updates: ClaimUpdate[] = [
      { id: 'clm_aaa111', sentence_ids: [1], source_docs: [], nli_score: 0.5, verified_at: '2026-05-04' },
    ];
    const result = updateClaimsFrontmatter(baseArticle, updates);
    expect(result).toContain('# Test Article');
    expect(result).toContain('Some body text here.');
  });

  test('returns content unchanged when no matching claims', () => {
    const updates: ClaimUpdate[] = [
      { id: 'clm_zzz999', sentence_ids: [1], source_docs: [], nli_score: 0.5, verified_at: '2026-05-04' },
    ];
    const result = updateClaimsFrontmatter(baseArticle, updates);
    expect(result).toBe(baseArticle);
  });

  test('handles claim with extra optional fields (jurisdiction, effective_from)', () => {
    const articleWithExtras = `---
title: Extra Fields
claims:
  - id: clm_ext001
    sentence_ids: []
    source_docs: []
    verified_at: null
    nli_score: null
    jurisdiction: US
    effective_from: 2020-01-01
---

Body.`;
    const updates: ClaimUpdate[] = [
      { id: 'clm_ext001', sentence_ids: [5], source_docs: ['x.md'], nli_score: 0.9, verified_at: '2026-05-04' },
    ];
    const result = updateClaimsFrontmatter(articleWithExtras, updates);
    expect(result).toContain('sentence_ids: [5]');
    expect(result).toContain('jurisdiction: US');
    expect(result).toContain('effective_from: 2020-01-01');
  });
});

describe('matchClaimToSentences', () => {
  test('returns candidates above threshold excluding same-article', () => {
    const mockStore = {
      searchSimilar: (_query: Float32Array, topK: number, _type?: string) => {
        return [
          { id: 1, text: 'Supporting evidence A', contextual_text: 'ctx A', type: 'sentence', source_url: 'raw-1.md', article_slug: 'other-article', section: 'Sec', source_score: 0, wiki: 'w', created: '2026-01-01', similarity: 0.85 },
          { id: 2, text: 'Same article text', contextual_text: 'ctx B', type: 'sentence', source_url: null, article_slug: 'test-article', section: 'Sec', source_score: 0, wiki: 'w', created: '2026-01-01', similarity: 0.90 },
          { id: 3, text: 'Weak match', contextual_text: 'ctx C', type: 'sentence', source_url: 'raw-2.md', article_slug: 'another', section: 'Sec', source_score: 0, wiki: 'w', created: '2026-01-01', similarity: 0.55 },
          { id: 4, text: 'Good match B', contextual_text: 'ctx D', type: 'sentence', source_url: 'raw-3.md', article_slug: 'third', section: 'Sec', source_score: 0, wiki: 'w', created: '2026-01-01', similarity: 0.75 },
        ].slice(0, topK);
      },
    };

    const mockEmbed = async (_text: string) => new Float32Array(768);

    const result = matchClaimToSentences(
      'Test claim text.',
      'test-article',
      mockStore as any,
      mockEmbed,
      { threshold: 0.7, topK: 10 },
    );

    return result.then((candidates) => {
      // Excludes same-article (id=2) and below-threshold (id=3)
      expect(candidates).toHaveLength(2);
      expect(candidates[0].id).toBe(1);
      expect(candidates[1].id).toBe(4);
    });
  });
});

describe('linkArticleClaims', () => {
  test('composes parse→match→NLI→update on fixture', async () => {
    const article = `---
title: Link Test
claims:
  - id: clm_lnk001
    sentence_ids: []
    source_docs: []
    verified_at: null
    nli_score: null
---

# Link Test

## Content

Shell companies hide beneficial ownership.[[clm_lnk001]]
`;

    const mockStore = {
      searchSimilar: (_query: Float32Array, _topK: number, _type?: string) => [
        { id: 42, text: 'Shell entities obscure true owners', contextual_text: 'ctx', type: 'sentence', source_url: 'raw-doc.md', article_slug: 'other', section: 'S', source_score: 0, wiki: 'w', created: '2026-01-01', similarity: 0.85 },
      ],
    };

    const mockEmbed = async (_text: string) => new Float32Array(768);

    const mockNli = async (_prompt: string) => ({
      output: '[NLI pair=1] ENTAILS | Evidence supports claim about shell companies.',
      iterations: 1,
      toolTrace: [],
      terminationReason: 'complete' as const,
    });

    const result = await linkArticleClaims(article, 'link-test', {
      store: mockStore as any,
      embedFn: mockEmbed,
      nliFn: mockNli,
    });

    expect(result.claims_processed).toBe(1);
    expect(result.claims_linked).toBe(1);
    expect(result.claims_verified).toBe(1);
    expect(result.updatedContent).toContain('sentence_ids: [42]');
    expect(result.updatedContent).toContain("source_docs: ['raw-doc.md']");
    expect(result.updatedContent).toContain('nli_score: 1');
    const today = new Date().toISOString().slice(0, 10);
    expect(result.updatedContent).toContain(`verified_at: ${today}`);
  });

  test('handles no matching sentences gracefully', async () => {
    const article = `---
title: No Match
claims:
  - id: clm_none01
    sentence_ids: []
    source_docs: []
    verified_at: null
    nli_score: null
---

# No Match

## Content

An obscure claim with no evidence.[[clm_none01]]
`;

    const mockStore = {
      searchSimilar: () => [],
    };
    const mockEmbed = async () => new Float32Array(768);
    const mockNli = async () => ({
      output: '',
      iterations: 1,
      toolTrace: [],
      terminationReason: 'complete' as const,
    });

    const result = await linkArticleClaims(article, 'no-match', {
      store: mockStore as any,
      embedFn: mockEmbed,
      nliFn: mockNli,
    });

    expect(result.claims_processed).toBe(1);
    expect(result.claims_linked).toBe(0);
    expect(result.claims_verified).toBe(0);
    // Content unchanged since no updates
    expect(result.updatedContent).toBe(article);
  });
});

describe('E2E claim linker verification', () => {
  const testArticle = `---
title: "Trade-Based Money Laundering: Methods and Detection"
aliases: [TBML, trade-based laundering]
category: concepts
tags: [aml, trade-finance, compliance]
status: reviewed
claims:
  - id: clm_e2e001
    sentence_ids: []
    source_docs: []
    verified_at: null
    nli_score: null
  - id: clm_e2e002
    sentence_ids: []
    source_docs: []
    verified_at: null
    nli_score: null
  - id: clm_e2e003
    sentence_ids: []
    source_docs: []
    verified_at: null
    nli_score: null
  - id: clm_e2e004
    sentence_ids: []
    source_docs: []
    verified_at: null
    nli_score: null
  - id: clm_e2e005
    sentence_ids: []
    source_docs: []
    verified_at: null
    nli_score: null
---

# Trade-Based Money Laundering: Methods and Detection

## Overview

Trade-based money laundering exploits international trade to transfer value across borders.[[clm_e2e001]]

TBML accounts for an estimated 80% of illicit financial flows globally.[[clm_e2e002]]

## Methods

Over-invoicing and under-invoicing are the most common TBML techniques.[[clm_e2e003]]

Shell companies are frequently used to obscure beneficial ownership in trade transactions.[[clm_e2e004]]

## Detection

Machine learning models can identify anomalous trade patterns with 85% accuracy.[[clm_e2e005]]

## Related

- [[shell-companies|Shell Companies]]
- [[trade-finance|Trade Finance]]
`;

  test('test article has 5+ claim markers with matching frontmatter (wiki-health check 14)', () => {
    const { parseClaimMarkers } = require('./claim-linker.ts');
    const markers = parseClaimMarkers(testArticle);
    expect(markers.length).toBeGreaterThanOrEqual(5);

    // Check 14: Marker integrity — every body marker has matching frontmatter entry
    const fmMatch = testArticle.match(/^---\n([\s\S]*?)\n---/);
    expect(fmMatch).toBeTruthy();
    const frontmatter = fmMatch![1];

    for (const marker of markers) {
      expect(frontmatter).toContain(`id: ${marker.id}`);
    }

    // Reverse: every frontmatter claim ID has a body marker
    const fmIds: string[] = [];
    for (const line of frontmatter.split('\n')) {
      const match = line.match(/^\s+- id: (clm_\w+)/);
      if (match) fmIds.push(match[1]);
    }
    const bodyIds = new Set(markers.map((m: any) => m.id));
    for (const fmId of fmIds) {
      expect(bodyIds.has(fmId)).toBe(true);
    }
  });

  test('E2E full pipeline with mocked services', async () => {
    const mockStore = {
      searchSimilar: (_query: Float32Array, _topK: number, _type?: string) => [
        { id: 100, text: 'TBML uses trade to move money', contextual_text: 'Document: TBML. Section: Intro. TBML uses trade to move money', type: 'sentence', source_url: 'raw-tbml-report.md', article_slug: 'tbml-fincen-report', section: 'Intro', source_score: 0.8, wiki: 'aml-wiki', created: '2026-01-01', similarity: 0.82 },
        { id: 101, text: 'Shell entities obscure ownership', contextual_text: 'Document: Shells. Section: Overview. Shell entities obscure ownership', type: 'sentence', source_url: 'raw-shell-companies.md', article_slug: 'shell-company-report', section: 'Overview', source_score: 0.7, wiki: 'aml-wiki', created: '2026-01-01', similarity: 0.78 },
      ],
    };

    const mockEmbed = async (_text: string) => new Float32Array(768);

    const mockNli = async (_prompt: string) => ({
      output: `[NLI pair=1] ENTAILS | Evidence directly supports the claim.
[NLI pair=2] ENTAILS | Evidence supports the claim.
[NLI pair=3] ENTAILS | Trade mispricing evidence supports claim.
[NLI pair=4] NEUTRAL | Related but not directly supporting.
[NLI pair=5] ENTAILS | Evidence supports the claim.
[NLI pair=6] ENTAILS | ML detection evidence supports claim.
[NLI pair=7] ENTAILS | Evidence supports.
[NLI pair=8] ENTAILS | Evidence supports.
[NLI pair=9] ENTAILS | Evidence supports.
[NLI pair=10] ENTAILS | Evidence supports.`,
      iterations: 1,
      toolTrace: [],
      terminationReason: 'complete' as const,
    });

    const result = await linkArticleClaims(testArticle, 'tbml-methods-detection', {
      store: mockStore as any,
      embedFn: mockEmbed,
      nliFn: mockNli,
    });

    expect(result.claims_processed).toBe(5);
    expect(result.claims_linked).toBeGreaterThanOrEqual(1);

    // Verify frontmatter was updated
    expect(result.updatedContent).toContain('sentence_ids: [100, 101]');
    expect(result.updatedContent).toContain("source_docs: ['raw-tbml-report.md', 'raw-shell-companies.md']");

    // Verify at least one claim has nli_score populated
    const hasNli = result.details.some((d) => d.nli_score !== null && d.nli_score > 0);
    expect(hasNli).toBe(true);

    // Verify lifecycle: originally all claims had empty sentence_ids, now some are populated
    const originalMarkers = parseClaimMarkers(testArticle);
    const linkedClaims = result.details.filter((d) => d.sentence_ids.length > 0);
    expect(linkedClaims.length).toBeGreaterThanOrEqual(1);
  });
});

describe('parseClaimMetadata', () => {
  test('extracts structured claim data from YAML frontmatter', () => {
    const content = `---
title: Test Article
claims:
  - id: clm_abc123
    sentence_ids: [10, 20, 30]
    source_docs: ['doc1.md', 'doc2.md']
    nli_score: 0.85
    verified_at: 2026-05-01
  - id: clm_def456
    sentence_ids: [40]
    source_docs: ['doc3.md']
    nli_score: 0.92
    verified_at: 2026-05-02
---

# Test Article

Some body text.
`;
    const result = parseClaimMetadata(content);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 'clm_abc123',
      sentence_ids: [10, 20, 30],
      source_docs: ['doc1.md', 'doc2.md'],
      nli_score: 0.85,
      verified_at: '2026-05-01',
    });
    expect(result[1]).toEqual({
      id: 'clm_def456',
      sentence_ids: [40],
      source_docs: ['doc3.md'],
      nli_score: 0.92,
      verified_at: '2026-05-02',
    });
  });

  test('returns empty array for article with no claims', () => {
    const content = `---
title: No Claims Article
tags: [test]
---

# No Claims

Just body text.
`;
    const result = parseClaimMetadata(content);
    expect(result).toEqual([]);
  });

  test('handles unlinked claims with empty/null fields', () => {
    const content = `---
title: Unlinked
claims:
  - id: clm_unlink1
    sentence_ids: []
    source_docs: []
    nli_score: null
    verified_at: null
---

Body.
`;
    const result = parseClaimMetadata(content);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'clm_unlink1',
      sentence_ids: [],
      source_docs: [],
      nli_score: null,
      verified_at: null,
    });
  });

  test('handles malformed claim entries gracefully', () => {
    const content = `---
title: Partial
claims:
  - id: clm_partial1
    sentence_ids: [5]
  - id: clm_partial2
    nli_score: 0.5
---

Body.
`;
    const result = parseClaimMetadata(content);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('clm_partial1');
    expect(result[0].sentence_ids).toEqual([5]);
    expect(result[0].source_docs).toEqual([]);
    expect(result[0].nli_score).toBeNull();
    expect(result[0].verified_at).toBeNull();
    expect(result[1].id).toBe('clm_partial2');
    expect(result[1].sentence_ids).toEqual([]);
    expect(result[1].nli_score).toBe(0.5);
  });

  test('returns empty array for article with no frontmatter', () => {
    const content = `# No Frontmatter

Just body text with no YAML.
`;
    const result = parseClaimMetadata(content);
    expect(result).toEqual([]);
  });
});
