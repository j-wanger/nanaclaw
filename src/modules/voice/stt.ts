import fs from 'fs';
import path from 'path';

const AUDIO_EXTENSIONS = new Set(['.ogg', '.opus', '.m4a', '.wav', '.mp3', '.webm', '.flac', '.aac']);

export function isAudioFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return AUDIO_EXTENSIONS.has(ext);
}

export async function transcribeAudio(filePath: string, whisperUrl: string): Promise<string | null> {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer]);
    const form = new FormData();
    form.append('file', blob, path.basename(filePath));
    form.append('response_format', 'json');

    const res = await fetch(`${whisperUrl}/v1/audio/transcriptions`, {
      method: 'POST',
      body: form,
    });

    if (!res.ok) return null;

    const json = (await res.json()) as { text?: string };
    return typeof json.text === 'string' && json.text.length > 0 ? json.text : null;
  } catch {
    return null;
  }
}
