import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { getOutboundDb } from '../db/connection.js';
import { writeMessageOut } from '../db/messages-out.js';
import { registerTools } from './server.js';
import type { McpToolDefinition } from './types.js';

function log(msg: string): void {
  console.error(`[session-end] ${msg}`);
}

export async function handleEndSession(args: Record<string, unknown>): Promise<CallToolResult> {
  const reason = (args.reason as string || '').trim();
  const resumePrompt = (args.resume_prompt as string | undefined)?.trim() || undefined;

  if (!reason) {
    return { content: [{ type: 'text', text: 'Error: reason is required' }] };
  }

  getOutboundDb().prepare('DELETE FROM session_state').run();
  log(`Cleared session_state (reason: ${reason})`);

  const payload: Record<string, unknown> = { action: 'end_session', reason };
  if (resumePrompt) payload.resume_prompt = resumePrompt;

  writeMessageOut({
    id: `end-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: 'system',
    content: JSON.stringify(payload),
  });

  log(`System action written${resumePrompt ? ' (with resume_prompt)' : ''}`);

  return {
    content: [{
      type: 'text',
      text: `Session ending: ${reason}. ${resumePrompt ? 'Will re-wake with resume prompt.' : 'Waiting for next inbound message.'}`,
    }],
  };
}

const tools: McpToolDefinition[] = [
  {
    tool: {
      name: 'end_session',
      description: 'End the current session and optionally re-wake with a fresh context window. Use when context is getting full or a natural work boundary is reached. Write handover state to .session-handover-state.md BEFORE calling this tool. With resume_prompt, the agent re-wakes immediately with fresh context and picks up from the handover state.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          reason: { type: 'string', description: 'Why the session is ending (e.g. "context full", "work boundary", "curation batch complete")' },
          resume_prompt: { type: 'string', description: 'Optional prompt to inject as the next inbound message, triggering immediate re-wake with fresh context. Omit to wait for user message.' },
        },
        required: ['reason'],
      },
    },
    handler: handleEndSession,
  },
];

registerTools(tools);
