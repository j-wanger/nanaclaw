import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { initHandler } from './project-init.js';

function getText(result: { content: Array<{ text: string }> }): string {
  return result.content[0].text;
}

describe('project_init', () => {
  let tmpDir: string;
  let origCwd: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-init-test-'));
    origCwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(origCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('creates .project/ with plan.md, tasks.md, state.md', async () => {
    const result = await initHandler({ name: 'test-project', objective: 'Build a parser' });
    const data = JSON.parse(getText(result));

    expect(data.exists).toBe(false);
    expect(data.message).toContain('initialized');

    const projectDir = path.join(tmpDir, '.project');
    expect(fs.existsSync(path.join(projectDir, 'plan.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, 'tasks.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, 'state.md'))).toBe(true);
  });

  test('plan.md contains name and objective', async () => {
    await initHandler({ name: 'my-project', objective: 'Implement feature X' });

    const plan = fs.readFileSync(path.join(tmpDir, '.project', 'plan.md'), 'utf8');
    expect(plan).toContain('my-project');
    expect(plan).toContain('Implement feature X');
  });

  test('state.md contains status: planning and current_task: 0', async () => {
    await initHandler({ name: 'test', objective: 'Test objective' });

    const state = fs.readFileSync(path.join(tmpDir, '.project', 'state.md'), 'utf8');
    expect(state).toContain('status: planning');
    expect(state).toContain('current_task: 0');
  });

  test('returns current state if .project/ already exists (re-init guard)', async () => {
    await initHandler({ name: 'first', objective: 'First init' });

    const statePath = path.join(tmpDir, '.project', 'state.md');
    const originalState = fs.readFileSync(statePath, 'utf8');
    fs.writeFileSync(statePath, originalState.replace('current_task: 0', 'current_task: 3'));

    const result = await initHandler({ name: 'second', objective: 'Should not overwrite' });
    const data = JSON.parse(getText(result));

    expect(data.exists).toBe(true);
    expect(data.message).toContain('already exists');
    expect(data.state).toContain('current_task: 3');

    const plan = fs.readFileSync(path.join(tmpDir, '.project', 'plan.md'), 'utf8');
    expect(plan).toContain('first');
    expect(plan).not.toContain('second');
  });

  test('requires name', async () => {
    const result = await initHandler({ objective: 'Test' });
    expect(getText(result)).toContain('Error');
    expect(getText(result)).toContain('name');
  });

  test('requires objective', async () => {
    const result = await initHandler({ name: 'test' });
    expect(getText(result)).toContain('Error');
    expect(getText(result)).toContain('objective');
  });
});
