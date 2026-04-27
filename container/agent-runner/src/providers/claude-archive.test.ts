import { describe, it, expect } from 'bun:test';

import { parseTranscript, formatTranscriptMarkdown } from './claude.js';

describe('parseTranscript', () => {
  it('extracts user and assistant messages from JSONL', () => {
    const lines = [
      JSON.stringify({ type: 'user', message: { role: 'user', content: 'Hello' } }),
      JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'Hi there' }] } }),
      JSON.stringify({ type: 'user', message: { role: 'user', content: 'How are you?' } }),
    ].join('\n');

    const result = parseTranscript(lines);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ role: 'user', content: 'Hello' });
    expect(result[1]).toEqual({ role: 'assistant', content: 'Hi there' });
    expect(result[2]).toEqual({ role: 'user', content: 'How are you?' });
  });

  it('skips non-text assistant content blocks', () => {
    const lines = [
      JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', id: 'x', name: 'Read', input: {} },
            { type: 'text', text: 'Result here' },
          ],
        },
      }),
    ].join('\n');

    const result = parseTranscript(lines);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('Result here');
  });

  it('returns empty array for empty input', () => {
    expect(parseTranscript('')).toHaveLength(0);
  });

  it('skips malformed lines', () => {
    const lines = [
      'not json',
      JSON.stringify({ type: 'user', message: { role: 'user', content: 'Valid' } }),
      '{broken',
    ].join('\n');

    const result = parseTranscript(lines);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('Valid');
  });
});

describe('formatTranscriptMarkdown', () => {
  it('produces markdown with title and messages', () => {
    const messages = [
      { role: 'user' as const, content: 'Hello' },
      { role: 'assistant' as const, content: 'Hi!' },
    ];

    const md = formatTranscriptMarkdown(messages, 'Test Chat', 'Andy');
    expect(md).toContain('# Test Chat');
    expect(md).toContain('**User**: Hello');
    expect(md).toContain('**Andy**: Hi!');
    expect(md).toContain('Archived:');
  });

  it('falls back to default title and assistant name', () => {
    const messages = [{ role: 'assistant' as const, content: 'Response' }];
    const md = formatTranscriptMarkdown(messages);
    expect(md).toContain('# Conversation');
    expect(md).toContain('**Assistant**: Response');
  });

  it('truncates long content at 2000 chars', () => {
    const longContent = 'x'.repeat(3000);
    const messages = [{ role: 'user' as const, content: longContent }];
    const md = formatTranscriptMarkdown(messages);
    expect(md).toContain('...');
    expect(md.length).toBeLessThan(longContent.length + 500);
  });
});
