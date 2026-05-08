import { describe, it, expect } from 'bun:test';
import { stripCitationMarkers } from './sentence-embed-pipeline.js';

describe('stripCitationMarkers', () => {
  it('removes source slug citations', () => {
    const input = 'Trade-based ML uses invoicing [tbml-invoicing-patterns]. Sanctions evasion is common [sanctions-evasion-methods].';
    const result = stripCitationMarkers(input);
    expect(result).toBe('Trade-based ML uses invoicing . Sanctions evasion is common .');
  });

  it('preserves single-word bracket references', () => {
    expect(stripCitationMarkers('See [note] for details')).toBe('See [note] for details');
    expect(stripCitationMarkers('Reference [1] is key')).toBe('Reference [1] is key');
    expect(stripCitationMarkers('Click [here] to continue')).toBe('Click [here] to continue');
  });

  it('handles multiple citations in one line', () => {
    const input = 'Both methods [method-one-slug] and techniques [technique-two-slug] apply.';
    const result = stripCitationMarkers(input);
    expect(result).toBe('Both methods  and techniques  apply.');
  });

  it('returns unchanged text when no citations present', () => {
    const input = 'No citations in this text.';
    expect(stripCitationMarkers(input)).toBe(input);
  });

  it('handles empty string', () => {
    expect(stripCitationMarkers('')).toBe('');
  });
});
