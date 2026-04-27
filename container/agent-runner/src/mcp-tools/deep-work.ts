import fs from 'fs';
import path from 'path';

import { registerTools } from './server.js';
import type { McpToolDefinition } from './types.js';

export interface DeepWorkState {
  goal: string;
  plan: string[];
  started_at: string;
  deadline: string;
  completed: string[];
  current: string | null;
  updates: Array<{ timestamp: string; note: string }>;
}

function deepWorkPath(): string {
  const agentDir = process.env.NANOCLAW_AGENT_DIR || '/workspace/agent';
  return path.join(agentDir, 'deep_work.json');
}

export function readDeepWorkState(filePath?: string): DeepWorkState | null {
  const p = filePath ?? deepWorkPath();
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as DeepWorkState;
  } catch {
    return null;
  }
}

export function writeDeepWorkState(filePath: string, state: DeepWorkState): void {
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2) + '\n');
}

export function parseDeadline(
  args: { deadline_minutes?: number; deadline_time?: string },
  now: Date = new Date(),
): string {
  if (typeof args.deadline_minutes === 'number') {
    return new Date(now.getTime() + args.deadline_minutes * 60_000).toISOString();
  }
  if (typeof args.deadline_time === 'string') {
    return args.deadline_time;
  }
  throw new Error('Either deadline_minutes or deadline_time is required');
}

const PREMATURE_KEYWORDS = [
  'done with everything',
  'finished everything',
  'all done',
  'completed everything',
  'nothing left',
  'all tasks complete',
  'i am done',
  "i'm done",
];

function ok(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

function err(text: string) {
  return { content: [{ type: 'text' as const, text }], isError: true as const };
}

function remainingMinutes(state: DeepWorkState): number {
  return Math.max(0, (new Date(state.deadline).getTime() - Date.now()) / 60_000);
}

export const startDeepWork: McpToolDefinition = {
  tool: {
    name: 'start_deep_work',
    description:
      'Start a time-bounded deep work session. Provide a goal, deadline, and plan. The agent will work autonomously until the deadline.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        goal: { type: 'string', description: 'What to accomplish in this session' },
        deadline_minutes: { type: 'number', description: 'Minutes from now until deadline' },
        deadline_time: { type: 'string', description: 'Absolute ISO 8601 deadline (alternative to deadline_minutes)' },
        plan: { type: 'string', description: 'Newline-separated plan steps' },
      },
      required: ['goal', 'plan'],
    },
  },
  async handler(args) {
    const p = deepWorkPath();
    if (readDeepWorkState(p)) {
      return err('A deep work session is already active. Use end_deep_work to finish it first.');
    }

    const now = new Date();
    let deadline: string;
    try {
      deadline = parseDeadline(
        { deadline_minutes: args.deadline_minutes as number | undefined, deadline_time: args.deadline_time as string | undefined },
        now,
      );
    } catch (e) {
      return err((e as Error).message);
    }

    const planStr = (args.plan as string) || '';
    const state: DeepWorkState = {
      goal: args.goal as string,
      plan: planStr.split('\n').map((s) => s.trim()).filter(Boolean),
      started_at: now.toISOString(),
      deadline,
      completed: [],
      current: null,
      updates: [],
    };

    writeDeepWorkState(p, state);
    const mins = Math.round((new Date(deadline).getTime() - now.getTime()) / 60_000);
    return ok(`Deep work started. Goal: ${state.goal}\nDeadline: ${mins} minutes from now.\nPlan: ${state.plan.length} steps.`);
  },
};

export const updateDeepWork: McpToolDefinition = {
  tool: {
    name: 'update_deep_work',
    description: 'Update progress on the current deep work session. Call after completing each sub-task.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        progress: { type: 'string', description: 'What was accomplished since last update' },
        completed_step: { type: 'string', description: 'Plan step that was completed' },
        current_step: { type: 'string', description: 'Plan step now being worked on' },
      },
      required: ['progress'],
    },
  },
  async handler(args) {
    const p = deepWorkPath();
    const state = readDeepWorkState(p);
    if (!state) return err('No active deep work session.');

    const progress = (args.progress as string) || '';
    const completedStep = args.completed_step as string | undefined;
    const currentStep = args.current_step as string | undefined;

    if (completedStep && !state.completed.includes(completedStep)) {
      state.completed.push(completedStep);
    }
    if (currentStep !== undefined) {
      state.current = currentStep;
    }

    state.updates.push({ timestamp: new Date().toISOString(), note: progress });
    writeDeepWorkState(p, state);

    const remaining = remainingMinutes(state);
    const lower = progress.toLowerCase();
    const premature = PREMATURE_KEYWORDS.some((kw) => lower.includes(kw));

    let response = `Progress recorded. ${state.completed.length}/${state.plan.length} steps done. ${Math.round(remaining)} min remaining.`;
    if (premature && remaining > 30) {
      response += `\n\n⚠️ Premature completion detected — ${Math.round(remaining)} minutes remaining. Continue working through your plan. Review, test, and improve what you've built.`;
    }

    return ok(response);
  },
};

export const endDeepWork: McpToolDefinition = {
  tool: {
    name: 'end_deep_work',
    description: 'End the current deep work session. Will refuse if >30 minutes remain — keep working.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        summary: { type: 'string', description: 'Summary of what was accomplished' },
      },
      required: ['summary'],
    },
  },
  async handler(args) {
    const p = deepWorkPath();
    const state = readDeepWorkState(p);
    if (!state) return err('No active deep work session.');

    const remaining = remainingMinutes(state);
    if (remaining > 30) {
      return err(
        `Cannot end early — ${Math.round(remaining)} minutes remaining (>30 min threshold). ` +
          `Continue working. Review your plan, test your work, or improve what you've built.`,
      );
    }

    fs.rmSync(p, { force: true });
    return ok(`Deep work session ended.\nGoal: ${state.goal}\nCompleted: ${state.completed.length}/${state.plan.length} steps.\nSummary: ${args.summary as string}`);
  },
};

export const getDeepWorkStatus: McpToolDefinition = {
  tool: {
    name: 'get_deep_work_status',
    description: 'Get the current status of a deep work session. Use after compaction to recover context.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  async handler() {
    const state = readDeepWorkState();
    if (!state) return ok('No active deep work session.');

    const remaining = remainingMinutes(state);
    const elapsed = (Date.now() - new Date(state.started_at).getTime()) / 60_000;
    const pending = state.plan.filter((s) => !state.completed.includes(s));

    return ok(
      `Deep work session active.\n` +
        `Goal: ${state.goal}\n` +
        `Elapsed: ${Math.round(elapsed)} min | Remaining: ${Math.round(remaining)} min\n` +
        `Deadline: ${state.deadline}\n` +
        `Completed (${state.completed.length}): ${state.completed.join(', ') || '(none)'}\n` +
        `Current: ${state.current || '(none)'}\n` +
        `Pending (${pending.length}): ${pending.join(', ') || '(none)'}\n` +
        `Updates: ${state.updates.length}`,
    );
  },
};

/**
 * Check if a deep work session is active and build a continuation prompt.
 * Returns null if no session or deadline has passed.
 */
export function checkDeepWorkContinuation(): string | null {
  const state = readDeepWorkState();
  if (!state) return null;

  const remaining = remainingMinutes(state);
  if (remaining <= 0) return null;

  const elapsed = (Date.now() - new Date(state.started_at).getTime()) / 60_000;
  const pending = state.plan.filter((s) => !state.completed.includes(s));

  let urgency: string;
  if (remaining > 120) {
    urgency = 'You have plenty of time for deep focus. Be ambitious — tackle the hardest parts now.';
  } else if (remaining > 30) {
    urgency = 'Good pace. Stay focused and on track with your plan.';
  } else if (remaining > 10) {
    urgency = 'Time is getting short. Prioritize completing your current step and testing.';
  } else {
    urgency = 'Final minutes — wrap up. Finish current work, test what you have, commit, and call end_deep_work with a summary.';
  }

  return (
    `[Deep Work Continuation]\n` +
    `Goal: ${state.goal}\n` +
    `Elapsed: ${Math.round(elapsed)} min | Remaining: ${Math.round(remaining)} min\n` +
    `Completed: ${state.completed.join(', ') || '(none)'}\n` +
    `Current: ${state.current || '(none)'}\n` +
    `Pending: ${pending.join(', ') || '(none)'}\n` +
    `\n${urgency}\n` +
    `\nContinue working on your plan. Use update_deep_work after each step.`
  );
}

registerTools([startDeepWork, updateDeepWork, endDeepWork, getDeepWorkStatus]);
