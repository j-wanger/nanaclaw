import { describe, it, expect } from 'bun:test';
import { splitSentences, type SentenceEntry } from './sentence-splitter.js';

describe('splitSentences', () => {
  it('splits simple text on sentence boundaries', () => {
    const text = 'First sentence. Second sentence. Third sentence.';
    const result = splitSentences(text);
    expect(result).toHaveLength(3);
    expect(result[0].text).toBe('First sentence.');
    expect(result[1].text).toBe('Second sentence.');
    expect(result[2].text).toBe('Third sentence.');
  });

  it('handles ! and ? sentence endings', () => {
    const text = 'Is this a question? Yes it is! And a statement.';
    const result = splitSentences(text);
    expect(result).toHaveLength(3);
    expect(result[0].text).toBe('Is this a question?');
    expect(result[1].text).toBe('Yes it is!');
  });

  it('strips YAML frontmatter', () => {
    const text = '---\ntitle: Test\ntags: [a, b]\n---\n\nActual content here.';
    const result = splitSentences(text);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Actual content here.');
  });

  it('skips code blocks', () => {
    const text = 'Before code.\n\n```javascript\nconst x = 1. Something.\n```\n\nAfter code.';
    const result = splitSentences(text);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('Before code.');
    expect(result[1].text).toBe('After code.');
  });

  it('extracts section headings', () => {
    const text = '## Introduction\n\nFirst point. Second point.\n\n## Methods\n\nThird point.';
    const result = splitSentences(text);
    expect(result).toHaveLength(3);
    expect(result[0].section).toBe('Introduction');
    expect(result[1].section).toBe('Introduction');
    expect(result[2].section).toBe('Methods');
  });

  it('skips sentences shorter than 10 chars', () => {
    const text = 'OK. This is a real sentence. No. Another real one here.';
    const result = splitSentences(text);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('This is a real sentence.');
    expect(result[1].text).toBe('Another real one here.');
  });

  it('includes position (0-based index)', () => {
    const text = 'First sentence. Second sentence.';
    const result = splitSentences(text);
    expect(result[0].position).toBe(0);
    expect(result[1].position).toBe(1);
  });

  it('handles headings-only lines without treating them as sentences', () => {
    const text = '## Summary\n\nThe bank was fined.';
    const result = splitSentences(text);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('The bank was fined.');
    expect(result[0].section).toBe('Summary');
  });

  it('returns empty array for empty input', () => {
    expect(splitSentences('')).toEqual([]);
    expect(splitSentences('---\ntitle: x\n---')).toEqual([]);
  });

  it('handles list items as sentences', () => {
    const text = '## Key Points\n\n- The penalty was large. It was unprecedented.\n- Another finding here.';
    const result = splitSentences(text);
    expect(result.length).toBeGreaterThanOrEqual(3);
    expect(result.some((s) => s.text.includes('penalty'))).toBe(true);
  });

  it('handles tables by skipping them', () => {
    const text = 'Before table.\n\n| Col A | Col B |\n|-------|-------|\n| val1 | val2 |\n\nAfter table.';
    const result = splitSentences(text);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('Before table.');
    expect(result[1].text).toBe('After table.');
  });

  it('does not split on abbreviations like U.S. or Dr.', () => {
    const text = 'The U.S. government imposed sanctions. Dr. Smith testified.';
    const result = splitSentences(text);
    expect(result).toHaveLength(2);
    expect(result[0].text).toContain('U.S.');
    expect(result[1].text).toContain('Dr.');
  });
});
