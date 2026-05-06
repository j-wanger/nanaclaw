import { executeAgentLoop, type AgentLoopResult } from './local-worker/agent-loop.js';
import type { ConflictPair } from './knowledge-conflicts.js';

export type ConflictClassification = 'agree' | 'contradict' | 'unrelated';

export interface ConflictResult {
  pair: number;
  classification: ConflictClassification;
  explanation: string;
}

const VALID_CLASSIFICATIONS = new Set<string>(['agree', 'contradict', 'unrelated']);
const RESULT_RE = /\[RESULT pair=(\d+)\]\s*(AGREE|CONTRADICT|UNRELATED)\s*\|\s*(.+)/gi;

export function parseConflictResults(output: string, _expectedCount: number): ConflictResult[] {
  const results: ConflictResult[] = [];
  let match: RegExpExecArray | null;
  while ((match = RESULT_RE.exec(output)) !== null) {
    const classification = match[2].toLowerCase();
    if (!VALID_CLASSIFICATIONS.has(classification)) continue;
    results.push({
      pair: parseInt(match[1], 10),
      classification: classification as ConflictClassification,
      explanation: match[3].trim(),
    });
  }
  RESULT_RE.lastIndex = 0;
  return results;
}

export function validateConflictOutput(results: ConflictResult[], expectedCount: number): boolean {
  if (results.length === 0) return false;
  return results.length >= expectedCount;
}

export function buildConflictPrompt(pairs: ConflictPair[]): string {
  const pairTexts = pairs.map((p, i) => `PAIR ${i + 1}:\nA: ${p.a.text}\nB: ${p.b.text}`).join('\n\n');

  return `You are classifying pairs of sentences from different articles.

For each pair, determine the relationship:
- IF both sentences state consistent, non-contradictory information → AGREE
- IF the sentences make opposing claims about the same topic (different numbers, negation, conflicting outcomes) → CONTRADICT
- IF the sentences are about different topics despite surface similarity → UNRELATED

Output exactly one line per pair in this format:
[RESULT pair=N] AGREE|CONTRADICT|UNRELATED | brief explanation

${pairTexts}`;
}

export interface ClassifiedConflictPair extends ConflictPair {
  classification?: ConflictClassification;
  explanation?: string;
}

export async function classifyConflictPairs(pairs: ConflictPair[]): Promise<ClassifiedConflictPair[]> {
  if (pairs.length === 0) return [];

  try {
    const prompt = buildConflictPrompt(pairs);
    const result: AgentLoopResult = await executeAgentLoop({
      messages: [
        { role: 'system', content: 'You are a precise text classifier. Follow the output format exactly.' },
        { role: 'user', content: prompt },
      ],
      tools: [],
      maxIterations: 1,
      timeoutMs: 30_000,
      taskType: 'structured-output',
    });

    if (result.terminationReason !== 'complete') {
      return pairs.map((p) => ({ ...p }));
    }

    const parsed = parseConflictResults(result.output, pairs.length);
    if (!validateConflictOutput(parsed, Math.ceil(pairs.length * 0.5))) {
      return pairs.map((p) => ({ ...p }));
    }

    const byPair = new Map(parsed.map((r) => [r.pair, r]));
    return pairs.map((p, i) => {
      const r = byPair.get(i + 1);
      return r ? { ...p, classification: r.classification, explanation: r.explanation } : { ...p };
    });
  } catch {
    return pairs.map((p) => ({ ...p }));
  }
}

