import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';

import {
  type DeepWorkState,
  readDeepWorkState,
  writeDeepWorkState,
  parseDeadline,
  checkDeepWorkContinuation,
} from './deep-work.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deep-work-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function statePath(): string {
  return path.join(tmpDir, 'deep_work.json');
}

describe('DeepWorkState round-trip', () => {
  it('writes and reads state faithfully', () => {
    const state: DeepWorkState = {
      goal: 'Implement authentication',
      plan: ['Design schema', 'Write middleware', 'Add tests'],
      started_at: '2026-04-26T10:00:00.000Z',
      deadline: '2026-04-26T12:00:00.000Z',
      completed: ['Design schema'],
      current: 'Write middleware',
      updates: [{ timestamp: '2026-04-26T10:30:00.000Z', note: 'Schema done' }],
    };
    writeDeepWorkState(statePath(), state);
    const loaded = readDeepWorkState(statePath());
    expect(loaded).toEqual(state);
  });

  it('returns null for missing file', () => {
    expect(readDeepWorkState(statePath())).toBeNull();
  });
});

describe('parseDeadline', () => {
  it('parses deadline_minutes into future ISO timestamp', () => {
    const now = new Date('2026-04-26T10:00:00.000Z');
    const result = parseDeadline({ deadline_minutes: 90 }, now);
    expect(result).toBe('2026-04-26T11:30:00.000Z');
  });

  it('parses deadline_time as ISO passthrough', () => {
    const now = new Date('2026-04-26T10:00:00.000Z');
    const result = parseDeadline({ deadline_time: '2026-04-26T14:00:00.000Z' }, now);
    expect(result).toBe('2026-04-26T14:00:00.000Z');
  });

  it('throws when neither deadline_minutes nor deadline_time provided', () => {
    expect(() => parseDeadline({}, new Date())).toThrow();
  });

  it('prefers deadline_minutes when both provided', () => {
    const now = new Date('2026-04-26T10:00:00.000Z');
    const result = parseDeadline(
      { deadline_minutes: 60, deadline_time: '2026-04-26T23:00:00.000Z' },
      now,
    );
    expect(result).toBe('2026-04-26T11:00:00.000Z');
  });
});

describe('start_deep_work tool', () => {
  // Import the tool handler dynamically to avoid side-effect registration
  let handler: (args: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>;

  beforeEach(async () => {
    const mod = await import('./deep-work.js');
    handler = mod.startDeepWork.handler;
    process.env.NANOCLAW_AGENT_DIR = tmpDir;
  });

  afterEach(() => {
    delete process.env.NANOCLAW_AGENT_DIR;
  });

  it('creates state file with correct deadline from minutes', async () => {
    const result = await handler({
      goal: 'Build feature X',
      deadline_minutes: 120,
      plan: 'Step 1\nStep 2\nStep 3',
    });
    expect(result.isError).toBeFalsy();

    const state = readDeepWorkState(statePath());
    expect(state).not.toBeNull();
    expect(state!.goal).toBe('Build feature X');
    expect(state!.plan).toEqual(['Step 1', 'Step 2', 'Step 3']);

    const deadline = new Date(state!.deadline).getTime();
    const started = new Date(state!.started_at).getTime();
    const diffMinutes = (deadline - started) / 60_000;
    expect(diffMinutes).toBeCloseTo(120, 0);
  });

  it('refuses when a session is already active', async () => {
    await handler({ goal: 'First', deadline_minutes: 60, plan: 'Do it' });
    const result = await handler({ goal: 'Second', deadline_minutes: 30, plan: 'Do more' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('already');
  });
});

describe('end_deep_work tool', () => {
  let startHandler: (args: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>;
  let endHandler: (args: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>;

  beforeEach(async () => {
    const mod = await import('./deep-work.js');
    startHandler = mod.startDeepWork.handler;
    endHandler = mod.endDeepWork.handler;
    process.env.NANOCLAW_AGENT_DIR = tmpDir;
  });

  afterEach(() => {
    delete process.env.NANOCLAW_AGENT_DIR;
  });

  it('refuses when >30 min remaining', async () => {
    await startHandler({ goal: 'Long task', deadline_minutes: 120, plan: 'Plan' });
    const result = await endHandler({ summary: 'Done early' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/30|remaining|early/i);
  });

  it('succeeds when deadline is near or past', async () => {
    const state: DeepWorkState = {
      goal: 'Quick task',
      plan: ['Do it'],
      started_at: new Date(Date.now() - 120 * 60_000).toISOString(),
      deadline: new Date(Date.now() + 5 * 60_000).toISOString(),
      completed: ['Do it'],
      current: null,
      updates: [],
    };
    writeDeepWorkState(statePath(), state);

    const result = await endHandler({ summary: 'All done' });
    expect(result.isError).toBeFalsy();
    expect(readDeepWorkState(statePath())).toBeNull();
  });
});

describe('update_deep_work tool', () => {
  let startHandler: (args: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>;
  let updateHandler: (args: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>;

  beforeEach(async () => {
    const mod = await import('./deep-work.js');
    startHandler = mod.startDeepWork.handler;
    updateHandler = mod.updateDeepWork.handler;
    process.env.NANOCLAW_AGENT_DIR = tmpDir;
  });

  afterEach(() => {
    delete process.env.NANOCLAW_AGENT_DIR;
  });

  it('warns on premature completion keywords', async () => {
    await startHandler({ goal: 'Big task', deadline_minutes: 120, plan: 'Step 1\nStep 2' });
    const result = await updateHandler({
      progress: 'I think I am done with everything',
      completed_step: 'Step 1',
    });
    expect(result.content[0].text).toMatch(/premature|early|continue|remaining/i);
  });

  it('records progress in state file', async () => {
    await startHandler({ goal: 'Task', deadline_minutes: 60, plan: 'A\nB' });
    await updateHandler({ progress: 'A is done', completed_step: 'A', current_step: 'B' });
    const state = readDeepWorkState(statePath());
    expect(state!.completed).toContain('A');
    expect(state!.current).toBe('B');
    expect(state!.updates.length).toBe(1);
  });
});

describe('checkDeepWorkContinuation', () => {
  beforeEach(() => {
    process.env.NANOCLAW_AGENT_DIR = tmpDir;
  });

  afterEach(() => {
    delete process.env.NANOCLAW_AGENT_DIR;
  });

  it('returns null when no state file', () => {
    expect(checkDeepWorkContinuation()).toBeNull();
  });

  it('returns null when deadline has passed', () => {
    const state: DeepWorkState = {
      goal: 'Expired task',
      plan: ['Step 1'],
      started_at: new Date(Date.now() - 120 * 60_000).toISOString(),
      deadline: new Date(Date.now() - 5 * 60_000).toISOString(),
      completed: [],
      current: 'Step 1',
      updates: [],
    };
    writeDeepWorkState(statePath(), state);
    expect(checkDeepWorkContinuation()).toBeNull();
  });

  it('returns prompt with goal and remaining time when deadline is future', () => {
    const state: DeepWorkState = {
      goal: 'Build feature',
      plan: ['Design', 'Implement', 'Test'],
      started_at: new Date(Date.now() - 30 * 60_000).toISOString(),
      deadline: new Date(Date.now() + 60 * 60_000).toISOString(),
      completed: ['Design'],
      current: 'Implement',
      updates: [{ timestamp: new Date().toISOString(), note: 'Design done' }],
    };
    writeDeepWorkState(statePath(), state);
    const prompt = checkDeepWorkContinuation();
    expect(prompt).not.toBeNull();
    expect(prompt).toContain('Build feature');
    expect(prompt).toContain('Implement');
    expect(prompt).toContain('Test');
  });

  it('includes strong urgency when >2h remaining', () => {
    const state: DeepWorkState = {
      goal: 'Long task',
      plan: ['A', 'B', 'C', 'D'],
      started_at: new Date(Date.now() - 10 * 60_000).toISOString(),
      deadline: new Date(Date.now() + 150 * 60_000).toISOString(),
      completed: [],
      current: 'A',
      updates: [],
    };
    writeDeepWorkState(statePath(), state);
    const prompt = checkDeepWorkContinuation()!;
    expect(prompt).toMatch(/plenty of time|deep focus|ambitious/i);
  });

  it('includes moderate urgency when 30m-2h remaining', () => {
    const state: DeepWorkState = {
      goal: 'Medium task',
      plan: ['A', 'B'],
      started_at: new Date(Date.now() - 60 * 60_000).toISOString(),
      deadline: new Date(Date.now() + 45 * 60_000).toISOString(),
      completed: ['A'],
      current: 'B',
      updates: [],
    };
    writeDeepWorkState(statePath(), state);
    const prompt = checkDeepWorkContinuation()!;
    expect(prompt).toMatch(/good pace|stay focused|on track/i);
  });

  it('includes wrap-up urgency when <10m remaining', () => {
    const state: DeepWorkState = {
      goal: 'Ending task',
      plan: ['A'],
      started_at: new Date(Date.now() - 110 * 60_000).toISOString(),
      deadline: new Date(Date.now() + 8 * 60_000).toISOString(),
      completed: ['A'],
      current: null,
      updates: [],
    };
    writeDeepWorkState(statePath(), state);
    const prompt = checkDeepWorkContinuation()!;
    expect(prompt).toMatch(/wrap.?up|finish|final/i);
  });
});
