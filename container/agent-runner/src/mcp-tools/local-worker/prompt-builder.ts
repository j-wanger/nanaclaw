import type { TaskContract } from './contract.js';

export interface WorkerPrompt {
  system: string;
  user: string;
}

const FORMAT_INSTRUCTIONS: Record<string, string> = {
  json: 'Output ONLY valid JSON. No explanation, no markdown fences, no commentary.',
  code: 'Output ONLY the code. No explanation, no markdown fences, no commentary.',
  markdown: 'Respond in markdown.',
};

const CHARS_PER_TOKEN = 4;

function trimToTokenBudget(text: string, budgetTokens: number): string {
  const maxChars = budgetTokens * CHARS_PER_TOKEN;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n\n[... context truncated to fit token budget]';
}

export function buildWorkerPrompt(contract: TaskContract): WorkerPrompt {
  const parts: string[] = [];

  parts.push(FORMAT_INSTRUCTIONS[contract.outputFormat] || '');

  if (contract.boundaries.length > 0) {
    parts.push('');
    parts.push('Boundaries:');
    for (const b of contract.boundaries) {
      parts.push(`- ${b}`);
    }
  }

  const system = parts.join('\n').trim();

  const userParts: string[] = [];
  userParts.push(contract.objective);

  if (contract.context) {
    const trimmed = trimToTokenBudget(contract.context, contract.context_budget_tokens);
    userParts.push('');
    userParts.push('Context:');
    userParts.push(trimmed);
  }

  const user = userParts.join('\n');

  return { system, user };
}
