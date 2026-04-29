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

const RESEARCH_TOOL_ROUTING = `
STRICT 3-step sequence — follow exactly:
STEP 1: call web_search ONCE. Pick the best URL from results.
STEP 2: call web_extract ONCE on that URL.
STEP 3: call wiki_write with the extracted content.
DO NOT call web_search or web_extract more than once each.
DO NOT skip wiki_write. It is the final required step.`;

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

  if (contract.tools && contract.tools.length > 0 && contract.type === 'research') {
    parts.push('');
    parts.push(RESEARCH_TOOL_ROUTING.trim());
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
