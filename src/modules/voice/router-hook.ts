import path from 'path';
import { isAudioFile, transcribeAudio } from './stt.js';

export async function processVoiceAttachments(
  contentStr: string,
  sessionDir: string,
  whisperUrl: string,
): Promise<string> {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(contentStr);
  } catch {
    return contentStr;
  }

  const attachments = parsed.attachments as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(attachments)) return contentStr;

  const audioAtts = attachments.filter(
    (a) => typeof a.localPath === 'string' && isAudioFile((a.name as string) || (a.localPath as string)),
  );
  if (audioAtts.length === 0) return contentStr;

  const transcriptions: string[] = [];
  for (const att of audioAtts) {
    const fullPath = path.join(sessionDir, att.localPath as string);
    const text = await transcribeAudio(fullPath, whisperUrl);
    if (text) transcriptions.push(text);
  }

  if (transcriptions.length === 0) return contentStr;

  const prefix = transcriptions.map((t) => `[Voice transcription: ${t}]`).join('\n');
  const existingText = (parsed.text as string) || '';
  parsed.text = existingText ? `${prefix}\n${existingText}` : prefix;

  return JSON.stringify(parsed);
}
