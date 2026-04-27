import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';

let tmpDir: string;
let origSessionDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voice-tts-test-'));
  origSessionDir = process.env.NANOCLAW_SESSION_DIR || '';
  process.env.NANOCLAW_SESSION_DIR = tmpDir;
});

afterEach(() => {
  process.env.NANOCLAW_SESSION_DIR = origSessionDir;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('speak tool', () => {
  it('generates mp3 and writes to outbox directory', async () => {
    const { speakHandler } = await import('./voice-tts.js');

    const result = await speakHandler({
      text: 'Hello world',
      _mockEdgeTts: true,
    });

    expect(result.content[0].text).toContain('Audio sent');

    const outboxDirs = fs.readdirSync(path.join(tmpDir, 'outbox'));
    expect(outboxDirs.length).toBeGreaterThan(0);

    const outboxFiles = fs.readdirSync(path.join(tmpDir, 'outbox', outboxDirs[0]));
    expect(outboxFiles.some((f: string) => f.endsWith('.mp3'))).toBe(true);
  });

  it('uses specified voice when provided', async () => {
    const { buildEdgeTtsArgs } = await import('./voice-tts.js');
    const args = buildEdgeTtsArgs('Hello', '/tmp/out.mp3', 'en-GB-SoniaNeural');
    expect(args).toContain('--voice');
    expect(args).toContain('en-GB-SoniaNeural');
  });

  it('uses default voice when none specified', async () => {
    const { buildEdgeTtsArgs, DEFAULT_VOICE } = await import('./voice-tts.js');
    const args = buildEdgeTtsArgs('Hello', '/tmp/out.mp3');
    expect(args).toContain('--voice');
    expect(args).toContain(DEFAULT_VOICE);
  });

  it('returns error when text is empty', async () => {
    const { speakHandler } = await import('./voice-tts.js');
    const result = await speakHandler({ text: '' });
    expect(result.content[0].text).toContain('text is required');
  });
});
