import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';

vi.mock('./stt.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./stt.js')>();
  return { ...actual, transcribeAudio: vi.fn() };
});

import { processVoiceAttachments } from './router-hook.js';
import { transcribeAudio } from './stt.js';

describe('processVoiceAttachments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('detects audio attachment and prepends transcription', async () => {
    vi.mocked(transcribeAudio).mockResolvedValueOnce('Hello, this is a voice note');

    const content = JSON.stringify({
      text: 'original text',
      attachments: [{ name: 'voice.ogg', localPath: 'inbox/msg1/voice.ogg', type: 'audio' }],
    });

    const result = await processVoiceAttachments(content, '/workspace', 'http://127.0.0.1:8178');
    const parsed = JSON.parse(result);

    expect(parsed.text).toContain('[Voice transcription: Hello, this is a voice note]');
    expect(parsed.text).toContain('original text');
    expect(vi.mocked(transcribeAudio)).toHaveBeenCalledWith('/workspace/inbox/msg1/voice.ogg', 'http://127.0.0.1:8178');
  });

  it('passes non-audio attachments through unchanged', async () => {
    const content = JSON.stringify({
      text: 'check this file',
      attachments: [{ name: 'photo.jpg', localPath: 'inbox/msg1/photo.jpg', type: 'image' }],
    });

    const result = await processVoiceAttachments(content, '/workspace', 'http://127.0.0.1:8178');
    expect(result).toBe(content);
    expect(vi.mocked(transcribeAudio)).not.toHaveBeenCalled();
  });

  it('preserves original message when transcription fails', async () => {
    vi.mocked(transcribeAudio).mockResolvedValueOnce(null);

    const content = JSON.stringify({
      text: 'original text',
      attachments: [{ name: 'voice.ogg', localPath: 'inbox/msg1/voice.ogg', type: 'audio' }],
    });

    const result = await processVoiceAttachments(content, '/workspace', 'http://127.0.0.1:8178');
    const parsed = JSON.parse(result);

    expect(parsed.text).toBe('original text');
  });

  it('handles content without attachments', async () => {
    const content = JSON.stringify({ text: 'plain message' });
    const result = await processVoiceAttachments(content, '/workspace', 'http://127.0.0.1:8178');
    expect(result).toBe(content);
  });

  it('handles non-JSON content gracefully', async () => {
    const content = 'just plain text';
    const result = await processVoiceAttachments(content, '/workspace', 'http://127.0.0.1:8178');
    expect(result).toBe(content);
  });

  it('handles multiple audio attachments', async () => {
    vi.mocked(transcribeAudio).mockResolvedValueOnce('First note').mockResolvedValueOnce('Second note');

    const content = JSON.stringify({
      text: '',
      attachments: [
        { name: 'note1.ogg', localPath: 'inbox/msg1/note1.ogg', type: 'audio' },
        { name: 'note2.m4a', localPath: 'inbox/msg1/note2.m4a', type: 'audio' },
      ],
    });

    const result = await processVoiceAttachments(content, '/workspace', 'http://127.0.0.1:8178');
    const parsed = JSON.parse(result);

    expect(parsed.text).toContain('First note');
    expect(parsed.text).toContain('Second note');
    expect(vi.mocked(transcribeAudio)).toHaveBeenCalledTimes(2);
  });
});
