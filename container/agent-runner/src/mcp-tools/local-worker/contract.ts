import fs from 'fs';
import path from 'path';

export type TaskType = 'file-op' | 'code-impl' | 'research' | 'structured-output';
export type OutputFormat = 'json' | 'code' | 'markdown';

export interface T0Check {
  type: 'json-valid' | 'contains' | 'not-contains' | 'regex' | 'line-count';
  params: Record<string, string>;
}

export interface WriteTo {
  wiki: string;
  tier: 'episodic' | 'review' | 'claims' | 'entities';
  title?: string;
  tags?: string[];
  target_path?: string;
  source_url?: string;
}

export interface TaskContract {
  id: string;
  type: TaskType;
  objective: string;
  outputFormat: OutputFormat;
  context: string;
  boundaries: string[];
  postconditions: T0Check[];
  timeout_ms: number;
  context_budget_tokens: number;
  tools?: string[];
  max_iterations?: number;
  write_to?: WriteTo;
}

export interface TaskResult {
  raw: string;
  parsed: string;
}

export interface VerificationCheckResult {
  type: string;
  passed: boolean;
  detail?: string;
}

export interface VerificationResult {
  passed: boolean;
  checks: VerificationCheckResult[];
}

export interface ToolTraceEntry {
  iteration: number;
  tool: string;
  args: Record<string, unknown>;
  result: string;
  latency_ms: number;
}

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'timeout' | 'cancelled';

export interface TaskState {
  contract: TaskContract;
  status: TaskStatus;
  created_at: string;
  completed_at?: string;
  result?: TaskResult;
  verification?: VerificationResult;
  toolTrace?: ToolTraceEntry[];
  error?: string;
  validationIssues?: string[];
}

const VALID_TYPES: TaskType[] = ['file-op', 'code-impl', 'research', 'structured-output'];
const VALID_FORMATS: OutputFormat[] = ['json', 'code', 'markdown'];

export function validateContract(c: TaskContract): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!c.id) errors.push('id is required');
  if (!c.objective) errors.push('objective is required');
  if (!VALID_TYPES.includes(c.type)) errors.push(`type must be one of: ${VALID_TYPES.join(', ')}`);
  if (!VALID_FORMATS.includes(c.outputFormat))
    errors.push(`outputFormat must be one of: ${VALID_FORMATS.join(', ')}`);
  if (!c.timeout_ms || c.timeout_ms <= 0) errors.push('timeout_ms must be positive');
  if (c.context_budget_tokens == null || c.context_budget_tokens <= 0)
    errors.push('context_budget_tokens must be positive');
  if (c.max_iterations != null && c.max_iterations <= 0)
    errors.push('max_iterations must be positive');
  if (c.write_to) {
    if (!c.write_to.wiki) errors.push('write_to.wiki is required');
    if (!['episodic', 'review', 'claims', 'entities'].includes(c.write_to.tier))
      errors.push('write_to.tier must be "episodic", "review", "claims", or "entities"');
  }
  return { valid: errors.length === 0, errors };
}

export function writeTaskState(filePath: string, state: TaskState): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2) + '\n');
}

export function readTaskState(filePath: string): TaskState | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as TaskState;
  } catch {
    return null;
  }
}

export function taskDir(baseDir: string): string {
  return path.join(baseDir, 'worker-tasks');
}

export function resultDir(baseDir: string): string {
  return path.join(baseDir, 'worker-results');
}
