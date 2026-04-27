import fs from 'fs';
import path from 'path';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { AGENT_DIR } from '../../config.js';
import type { TaskContract, TaskState } from './contract.js';
import { validateContract, writeTaskState, readTaskState, taskDir, resultDir } from './contract.js';
import { executeWorkerTask } from './dispatch.js';

function generateTaskId(): string {
  return `wt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getBaseDir(): string {
  return process.env.NANOCLAW_AGENT_DIR || AGENT_DIR;
}

function text(msg: string): CallToolResult {
  return { content: [{ type: 'text', text: msg }] };
}

export async function handleDispatchWorker(args: Record<string, unknown>): Promise<CallToolResult> {
  const id = generateTaskId();
  const contract: TaskContract = {
    id,
    type: (args.type as TaskContract['type']) || 'code-impl',
    objective: (args.objective as string) || '',
    outputFormat: (args.outputFormat as TaskContract['outputFormat']) || 'code',
    context: (args.context as string) || '',
    boundaries: (args.boundaries as string[]) || [],
    postconditions: (args.postconditions as TaskContract['postconditions']) || [],
    timeout_ms: (args.timeout_ms as number) || 60_000,
    context_budget_tokens: (args.context_budget_tokens as number) || 4096,
    ...(Array.isArray(args.tools) && args.tools.length > 0 ? { tools: args.tools as string[] } : {}),
  };

  const validation = validateContract(contract);
  if (!validation.valid) {
    return text(`Invalid contract: ${validation.errors.join(', ')}`);
  }

  const base = getBaseDir();
  const tasks = taskDir(base);
  const results = resultDir(base);
  fs.mkdirSync(tasks, { recursive: true });
  fs.mkdirSync(results, { recursive: true });

  const state: TaskState = {
    contract,
    status: 'pending',
    created_at: new Date().toISOString(),
  };
  writeTaskState(path.join(tasks, `${id}.json`), state);

  executeWorkerTask(contract, results).catch((err) => {
    const errState: TaskState = {
      contract,
      status: 'failed',
      created_at: state.created_at,
      error: err instanceof Error ? err.message : String(err),
    };
    writeTaskState(path.join(results, `${id}.json`), errState);
  });

  return text(`Worker task dispatched. ID: ${id}. Objective: ${contract.objective}. Results will auto-surface when complete.`);
}

export async function handleGetWorkerStatus(args: Record<string, unknown>): Promise<CallToolResult> {
  const taskId = args.task_id as string | undefined;
  const base = getBaseDir();
  const tasks = taskDir(base);
  const results = resultDir(base);

  if (taskId) {
    const resultPath = path.join(results, `${taskId}.json`);
    const resultState = readTaskState(resultPath);
    if (resultState) {
      return text(formatTaskSummary(resultState));
    }

    const taskPath = path.join(tasks, `${taskId}.json`);
    const taskState = readTaskState(taskPath);
    if (taskState) {
      return text(formatTaskSummary(taskState));
    }

    return text(`Task ${taskId} not found.`);
  }

  const lines: string[] = ['Worker tasks:'];
  for (const dir of [tasks, results]) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      const state = readTaskState(path.join(dir, file));
      if (state) lines.push(`- ${state.contract.id}: ${state.status} — ${state.contract.objective}`);
    }
  }

  return text(lines.length > 1 ? lines.join('\n') : 'No worker tasks.');
}

export async function handleCancelWorker(args: Record<string, unknown>): Promise<CallToolResult> {
  const taskId = args.task_id as string;
  const base = getBaseDir();
  const taskPath = path.join(taskDir(base), `${taskId}.json`);
  const state = readTaskState(taskPath);

  if (!state) {
    return text(`Task ${taskId} not found.`);
  }

  state.status = 'cancelled';
  writeTaskState(taskPath, state);
  return text(`Task ${taskId} cancelled.`);
}

function formatTaskSummary(state: TaskState): string {
  const lines: string[] = [];
  lines.push(`Task: ${state.contract.id}`);
  lines.push(`Status: ${state.status}`);
  lines.push(`Objective: ${state.contract.objective}`);

  if (state.status === 'completed' && state.result) {
    lines.push(`Verification: ${state.verification?.passed ? 'PASSED' : 'FAILED'}`);
    if (state.verification && !state.verification.passed) {
      for (const c of state.verification.checks) {
        if (!c.passed) lines.push(`  - ${c.type}: ${c.detail || 'failed'}`);
      }
    }
    lines.push(`Result:\n${state.result.parsed}`);
  }

  if (state.error) {
    lines.push(`Error: ${state.error}`);
  }

  return lines.join('\n');
}

export function checkWorkerResults(): string | null {
  const base = getBaseDir();
  const results = resultDir(base);

  if (!fs.existsSync(results)) return null;

  const files = fs.readdirSync(results).filter((f) => f.endsWith('.json'));
  if (files.length === 0) return null;

  const completed: TaskState[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    const filePath = path.join(results, file);
    const state = readTaskState(filePath);
    if (!state) continue;

    if (state.status === 'completed' || state.status === 'failed' || state.status === 'timeout') {
      completed.push(state);
      fs.unlinkSync(filePath);
    } else {
      skipped.push(file);
    }
  }

  if (completed.length === 0) return null;

  const parts = completed.map((s) => {
    const header = `[Worker ${s.contract.id}] ${s.status}`;
    const obj = `Objective: ${s.contract.objective}`;
    if (s.status === 'completed' && s.result) {
      const vStatus = s.verification?.passed ? 'T0 PASSED' : 'T0 FAILED';
      return `${header} (${vStatus})\n${obj}\nResult:\n${s.result.parsed}`;
    }
    if (s.error) {
      return `${header}\n${obj}\nError: ${s.error}`;
    }
    return `${header}\n${obj}`;
  });

  return `Worker results ready for review:\n\n${parts.join('\n\n---\n\n')}`;
}
