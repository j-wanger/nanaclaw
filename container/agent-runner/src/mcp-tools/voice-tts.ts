import fs from 'fs';
import path from 'path';
import { SESSION_DIR } from '../config.js';
import { writeMessageOut } from '../db/messages-out.js';
import { getSessionRouting } from '../db/session-routing.js';
import { registerTools } from './server.js';
import type { McpToolDefinition } from './types.js';

export const DEFAULT_VOICE = 'en-US-AriaNeural';

function log(msg: string): void {
  console.error(`[voice-tts] ${msg}`);
}

function generateId(): string {
  return `tts-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function ok(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

function err(text: string) {
  return { content: [{ type: 'text' as const, text: `Error: ${text}` }] };
}

export function buildEdgeTtsArgs(
  text: string,
  outputPath: string,
  voice?: string,
): string[] {
  return [
    '--text', text,
    '--voice', voice || DEFAULT_VOICE,
    '--write-media', outputPath,
  ];
}

async function runEdgeTts(args: string[]): Promise<{ ok: boolean; stderr: string }> {
  const proc = Bun.spawn(['edge-tts', ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const exitCode = await proc.exited;
  const stderr = await new Response(proc.stderr).text();
  return { ok: exitCode === 0, stderr };
}

export async function speakHandler(
  args: Record<string, unknown>,
) {
  const text = args.text as string;
  if (!text) return err('text is required');

  const voice = (args.voice as string) || DEFAULT_VOICE;
  const id = generateId();
  const filename = `${id}.mp3`;

  const sessionDir = process.env.NANOCLAW_SESSION_DIR || SESSION_DIR;
  const outboxDir = path.join(sessionDir, 'outbox', id);
  fs.mkdirSync(outboxDir, { recursive: true });
  const outputPath = path.join(outboxDir, filename);

  if (args._mockEdgeTts) {
    fs.writeFileSync(outputPath, Buffer.from('mock-mp3-data'));
  } else {
    const edgeArgs = buildEdgeTtsArgs(text, outputPath, voice);
    const result = await runEdgeTts(edgeArgs);
    if (!result.ok) {
      fs.rmSync(outboxDir, { recursive: true, force: true });
      return err(`edge-tts failed: ${result.stderr.slice(0, 200)}`);
    }

    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
      fs.rmSync(outboxDir, { recursive: true, force: true });
      return err('edge-tts produced no output');
    }
  }

  try {
    const routing = getSessionRouting();
    if (routing) {
      writeMessageOut({
        id,
        kind: 'chat',
        platform_id: routing.platform_id,
        channel_type: routing.channel_type,
        thread_id: routing.thread_id,
        content: JSON.stringify({ text: '', files: [filename] }),
      });
    }
  } catch {
    log(`speak: no session routing available, file saved to outbox only`);
  }

  log(`speak: ${id} (${voice}, ${text.length} chars)`);
  return ok(`Audio sent (id: ${id}, voice: ${voice})`);
}

const speakTool: McpToolDefinition = {
  tool: {
    name: 'speak',
    description: 'Convert text to speech audio and send it. Uses Microsoft Edge TTS voices.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        text: { type: 'string', description: 'Text to convert to speech' },
        voice: {
          type: 'string',
          description: `Voice name (default: ${DEFAULT_VOICE}). Use edge-tts --list-voices to see options.`,
        },
      },
      required: ['text'],
    },
  },
  async handler(args) {
    return speakHandler(args);
  },
};

registerTools([speakTool]);
