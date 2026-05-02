import { describe, it, expect } from 'bun:test';

import {
  parseConflictResults,
  parseClaimValidation,
  validateConflictOutput,
  validateClaimOutput,
  buildConflictPrompt,
  buildClaimValidationPrompt,
} from './knowledge-classify.js';
import type { ConflictPair } from './knowledge-conflicts.js';
import type { ClaimCandidate } from './knowledge-discovery.js';

const makePair = (aText: string, bText: string): ConflictPair => ({
  a: { text: aText, contextual_text: aText, article_slug: 'a', section: '', source_url: null },
  b: { text: bText, contextual_text: bText, article_slug: 'b', section: '', source_url: null },
  similarity: 0.9,
});

const makeCandidate = (text: string): ClaimCandidate => ({
  text,
  contextual_text: text,
  article_slug: 'target',
  section: '',
  source_url: null,
  similarity: 0.85,
  nearestClaim: 'Some existing claim.',
});

describe('parseConflictResults', () => {
  it('parses well-formed [RESULT] tags', () => {
    const output = `
[RESULT pair=1] CONTRADICT | They disagree about temperature
[RESULT pair=2] AGREE | Both say the same thing
[RESULT pair=3] UNRELATED | Different topics
    `.trim();

    const results = parseConflictResults(output, 3);
    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({ pair: 1, classification: 'contradict', explanation: 'They disagree about temperature' });
    expect(results[1]).toEqual({ pair: 2, classification: 'agree', explanation: 'Both say the same thing' });
    expect(results[2]).toEqual({ pair: 3, classification: 'unrelated', explanation: 'Different topics' });
  });

  it('handles missing pairs gracefully', () => {
    const output = '[RESULT pair=1] CONTRADICT | Disagree';
    const results = parseConflictResults(output, 3);
    expect(results).toHaveLength(1);
  });

  it('rejects unknown classification values', () => {
    const output = '[RESULT pair=1] MAYBE | Not sure';
    const results = parseConflictResults(output, 1);
    expect(results).toHaveLength(0);
  });
});

describe('parseClaimValidation', () => {
  it('parses well-formed [VALIDATE] tags', () => {
    const output = `
[VALIDATE 1] CLAIM | Specific verifiable assertion
[VALIDATE 2] NOT_CLAIM | Just context
    `.trim();

    const results = parseClaimValidation(output, 2);
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ index: 1, isClaim: true, explanation: 'Specific verifiable assertion' });
    expect(results[1]).toEqual({ index: 2, isClaim: false, explanation: 'Just context' });
  });

  it('handles missing indices gracefully', () => {
    const output = '[VALIDATE 1] CLAIM | Yes';
    const results = parseClaimValidation(output, 3);
    expect(results).toHaveLength(1);
  });
});

describe('validateConflictOutput', () => {
  it('passes when all pairs are classified', () => {
    const results = [
      { pair: 1, classification: 'contradict' as const, explanation: 'x' },
      { pair: 2, classification: 'agree' as const, explanation: 'y' },
    ];
    expect(validateConflictOutput(results, 2)).toBe(true);
  });

  it('fails when fewer results than expected', () => {
    const results = [{ pair: 1, classification: 'contradict' as const, explanation: 'x' }];
    expect(validateConflictOutput(results, 3)).toBe(false);
  });

  it('fails on empty results', () => {
    expect(validateConflictOutput([], 2)).toBe(false);
  });
});

describe('validateClaimOutput', () => {
  it('passes when all candidates are validated', () => {
    const results = [
      { index: 1, isClaim: true, explanation: 'x' },
      { index: 2, isClaim: false, explanation: 'y' },
    ];
    expect(validateClaimOutput(results, 2)).toBe(true);
  });

  it('fails when fewer results than expected', () => {
    const results = [{ index: 1, isClaim: true, explanation: 'x' }];
    expect(validateClaimOutput(results, 3)).toBe(false);
  });
});

describe('buildConflictPrompt', () => {
  it('contains decision-tree keywords', () => {
    const pairs = [makePair('Water boils at 100C.', 'Water boils at 99C.')];
    const prompt = buildConflictPrompt(pairs);
    expect(prompt).toContain('IF');
    expect(prompt).toContain('CONTRADICT');
    expect(prompt).toContain('AGREE');
    expect(prompt).toContain('UNRELATED');
    expect(prompt).toContain('[RESULT pair=');
  });

  it('includes all pair texts', () => {
    const pairs = [makePair('Sentence A.', 'Sentence B.')];
    const prompt = buildConflictPrompt(pairs);
    expect(prompt).toContain('Sentence A.');
    expect(prompt).toContain('Sentence B.');
  });
});

describe('buildClaimValidationPrompt', () => {
  it('contains decision-tree keywords', () => {
    const candidates = [makeCandidate('The CEO was convicted.')];
    const prompt = buildClaimValidationPrompt(candidates);
    expect(prompt).toContain('IF');
    expect(prompt).toContain('CLAIM');
    expect(prompt).toContain('NOT_CLAIM');
    expect(prompt).toContain('[VALIDATE');
  });

  it('includes candidate texts', () => {
    const candidates = [makeCandidate('Company fined $10M.')];
    const prompt = buildClaimValidationPrompt(candidates);
    expect(prompt).toContain('Company fined $10M.');
  });
});
