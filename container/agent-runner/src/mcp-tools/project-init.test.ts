import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { initHandler } from './project-init.js';
import { setActiveProject } from './project-context.js';

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
    setActiveProject(null);
  });

  afterEach(() => {
    process.chdir(origCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    setActiveProject(null);
  });

  test('creates .project/work/ with plan.md, tasks.md, progress.md', async () => {
    const result = await initHandler({ name: 'test-project', objective: 'Build a parser' });
    const data = JSON.parse(getText(result));

    expect(data.exists).toBe(false);
    expect(data.message).toContain('test-project');

    const workDir = path.join(tmpDir, '.project', 'work');
    expect(fs.existsSync(path.join(workDir, 'plan.md'))).toBe(true);
    expect(fs.existsSync(path.join(workDir, 'tasks.md'))).toBe(true);
    expect(fs.existsSync(path.join(workDir, 'progress.md'))).toBe(true);
  });

  test('plan.md contains name and objective', async () => {
    await initHandler({ name: 'my-project', objective: 'Implement feature X' });

    const plan = fs.readFileSync(path.join(tmpDir, '.project', 'work', 'plan.md'), 'utf8');
    expect(plan).toContain('my-project');
    expect(plan).toContain('Implement feature X');
  });

  test('progress.md contains status: planning and current_task: 0', async () => {
    await initHandler({ name: 'test', objective: 'Test objective' });

    const progress = fs.readFileSync(path.join(tmpDir, '.project', 'work', 'progress.md'), 'utf8');
    expect(progress).toContain('status: planning');
    expect(progress).toContain('current_task: 0');
  });

  test('returns current progress if work/ already exists (re-init guard)', async () => {
    await initHandler({ name: 'first', objective: 'First init' });

    const progressPath = path.join(tmpDir, '.project', 'work', 'progress.md');
    const original = fs.readFileSync(progressPath, 'utf8');
    fs.writeFileSync(progressPath, original.replace('current_task: 0', 'current_task: 3'));

    const result = await initHandler({ name: 'second', objective: 'Should not overwrite' });
    const data = JSON.parse(getText(result));

    expect(data.exists).toBe(true);
    expect(data.message).toContain('already exists');
    expect(data.progress).toContain('current_task: 3');

    const plan = fs.readFileSync(path.join(tmpDir, '.project', 'work', 'plan.md'), 'utf8');
    expect(plan).toContain('first');
    expect(plan).not.toContain('second');
  });

  test('uses active project path when set', async () => {
    const projectPath = path.join(tmpDir, 'my-project');
    fs.mkdirSync(projectPath, { recursive: true });
    setActiveProject({ name: 'test', path: projectPath, activated_at: new Date().toISOString() });

    await initHandler({ name: 'test', objective: 'Test' });

    expect(fs.existsSync(path.join(projectPath, '.project', 'work', 'plan.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.project'))).toBe(false);
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
