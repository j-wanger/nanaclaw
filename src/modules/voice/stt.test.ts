import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { transcribeAudio, isAudioFile } from './stt.js';

describe('isAudioFile', () => {
  it.each(['voice.ogg', 'note.opus', 'clip.m4a', 'recording.wav', 'song.mp3', 'stream.webm', 'VOICE.OGG', 'Note.M4A'])(
    'identifies %s as audio',
    (filename) => {
      expect(isAudioFile(filename)).toBe(true);
    },
  );

  it.each(['photo.jpg', 'doc.pdf', 'code.ts', 'readme.md', 'data.json', 'noextension'])(
    'rejects %s as non-audio',
    (filename) => {
      expect(isAudioFile(filename)).toBe(false);
    },
  );
});

describe('transcribeAudio', () => {
  const fixtureOgg = path.join(__dirname, 'fixtures', 'test.ogg');

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns transcription text from whisper-server response using real .ogg fixture', async () => {
    const mockResponse = { text: 'Hello world from whisper' };
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify(mockResponse), { status: 200 }));

    const result = await transcribeAudio(fixtureOgg, 'http://127.0.0.1:8178');
    expect(result).toBe('Hello world from whisper');

    const fetchCall = vi.mocked(global.fetch).mock.calls[0];
    expect(fetchCall[0]).toBe('http://127.0.0.1:8178/v1/audio/transcriptions');
    const body = fetchCall[1]?.body as FormData;
    expect(body).toBeInstanceOf(FormData);
  });

  it('returns null when server is unreachable (graceful degradation)', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const result = await transcribeAudio(fixtureOgg, 'http://127.0.0.1:9999');
    expect(result).toBeNull();
  });

  it('returns null when server returns non-200 status', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(new Response('Internal Server Error', { status: 500 }));

    const result = await transcribeAudio(fixtureOgg, 'http://127.0.0.1:8178');
    expect(result).toBeNull();
  });

  it('returns null when response JSON has no text field', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'bad audio' }), { status: 200 }),
    );

    const result = await transcribeAudio(fixtureOgg, 'http://127.0.0.1:8178');
    expect(result).toBeNull();
  });
});
