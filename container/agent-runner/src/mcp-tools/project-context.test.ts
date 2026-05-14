import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';

import { loadProjects, getActiveProject, setActiveProject } from './project-context.js';

let tmpDir: string;
let projectsPath: string;
let projectDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-ctx-test-'));
  projectsPath = path.join(tmpDir, 'projects.json');
  projectDir = path.join(tmpDir, 'test-project');
  fs.mkdirSync(projectDir, { recursive: true });
  process.env.PROJECTS_JSON_PATH = projectsPath;
  setActiveProject(null);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.PROJECTS_JSON_PATH;
  setActiveProject(null);
});

describe('loadProjects', () => {
  it('returns empty array when file missing', () => {
    expect(loadProjects(projectsPath)).toEqual([]);
  });

  it('reads projects from JSON', () => {
    fs.writeFileSync(projectsPath, JSON.stringify({
      version: 1,
      projects: [{ name: 'test', path: '/tmp/test', domain: 'testing' }],
    }));
    const projects = loadProjects(projectsPath);
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe('test');
    expect(projects[0].domain).toBe('testing');
  });
});

describe('in-memory active project', () => {
  it('returns null when no project activated', () => {
    expect(getActiveProject()).toBeNull();
  });

  it('get/set round-trips', () => {
    setActiveProject({ name: 'test', path: '/tmp/test', domain: 'testing', activated_at: '2026-05-12T00:00:00Z' });
    const active = getActiveProject();
    expect(active).not.toBeNull();
    expect(active!.name).toBe('test');
    expect(active!.domain).toBe('testing');
  });

  it('set null clears active project', () => {
    setActiveProject({ name: 'test', path: '/tmp/test', activated_at: '2026-05-12T00:00:00Z' });
    expect(getActiveProject()).not.toBeNull();
    setActiveProject(null);
    expect(getActiveProject()).toBeNull();
  });
});

describe('project_context tool integration', () => {
  async function callTool(args: Record<string, unknown>) {
    const { getRegisteredTool } = await import('./server.js');
    const tool = getRegisteredTool('project_context');
    if (!tool) throw new Error('project_context tool not registered');
    return tool.handler(args);
  }

  it('list returns empty when no projects', async () => {
    const result = await callTool({ action: 'list' });
    const data = JSON.parse(result.content[0].text);
    expect(data.projects).toEqual([]);
    expect(data.active).toBeNull();
  });

  it('init creates .project/ knowledge layer and registers', async () => {
    const result = await callTool({
      action: 'init',
      project: 'myproject',
      path: projectDir,
      domain: 'testing',
      description: 'A test project',
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.registered).toBe(true);
    expect(data.activated).toBe(true);
    expect(data.files_created.length).toBeGreaterThan(0);

    expect(fs.existsSync(path.join(projectDir, '.project', 'state.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, '.project', 'decisions'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, '.project', 'lessons.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, '.project', 'rules.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, '.project', 'index.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, '.project', 'PROTOCOL.md'))).toBe(true);

    const protocol = fs.readFileSync(path.join(projectDir, '.project', 'PROTOCOL.md'), 'utf8');
    expect(protocol).toContain('Task Protocol');
    expect(protocol).toContain('tasks.md');

    expect(fs.existsSync(path.join(projectDir, '.claude', 'rules', 'project-context.md'))).toBe(true);
    const pointer = fs.readFileSync(path.join(projectDir, '.claude', 'rules', 'project-context.md'), 'utf8');
    expect(pointer).toContain('.project/');
    expect(pointer).toContain('PROTOCOL.md');

    const projects = loadProjects(projectsPath);
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe('myproject');
  });

  it('init does not overwrite existing .claude/rules/project-context.md', async () => {
    fs.mkdirSync(path.join(projectDir, '.claude', 'rules'), { recursive: true });
    fs.writeFileSync(path.join(projectDir, '.claude', 'rules', 'project-context.md'), '# Custom rules');

    await callTool({ action: 'init', project: 'myproject', path: projectDir });

    const pointer = fs.readFileSync(path.join(projectDir, '.claude', 'rules', 'project-context.md'), 'utf8');
    expect(pointer).toBe('# Custom rules');
  });

  it('init skips .project/ creation when it already exists', async () => {
    fs.mkdirSync(path.join(projectDir, '.project'), { recursive: true });
    fs.writeFileSync(path.join(projectDir, '.project', 'state.md'), '# existing');

    const result = await callTool({
      action: 'init',
      project: 'myproject',
      path: projectDir,
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.files_created).toEqual([]);

    const state = fs.readFileSync(path.join(projectDir, '.project', 'state.md'), 'utf8');
    expect(state).toBe('# existing');
  });

  it('activate sets in-memory active project and returns state', async () => {
    fs.writeFileSync(projectsPath, JSON.stringify({
      version: 1,
      projects: [{ name: 'test', path: projectDir, domain: 'testing', description: 'Test' }],
    }));
    fs.mkdirSync(path.join(projectDir, '.project'), { recursive: true });
    fs.writeFileSync(path.join(projectDir, '.project', 'state.md'), '# Test State\nfocus: testing');

    const result = await callTool({ action: 'activate', project: 'test' });
    const data = JSON.parse(result.content[0].text);
    expect(data.activated).toBe('test');
    expect(data.path).toBe(projectDir);
    expect(data.domain).toBe('testing');
    expect(data.has_project).toBe(true);
    expect(data.state).toContain('Test State');

    const active = getActiveProject();
    expect(active).not.toBeNull();
    expect(active!.name).toBe('test');
  });

  it('activate fails for unknown project', async () => {
    fs.writeFileSync(projectsPath, JSON.stringify({ version: 1, projects: [] }));
    const result = await callTool({ action: 'activate', project: 'nope' });
    expect(result.isError).toBe(true);
  });

  it('status returns active project info', async () => {
    setActiveProject({
      name: 'test',
      path: projectDir,
      domain: 'testing',
      activated_at: new Date().toISOString(),
    });
    fs.mkdirSync(path.join(projectDir, '.project'), { recursive: true });
    fs.writeFileSync(path.join(projectDir, '.project', 'state.md'), '# Active');

    const result = await callTool({ action: 'status' });
    const data = JSON.parse(result.content[0].text);
    expect(data.active).toBe(true);
    expect(data.name).toBe('test');
    expect(data.state).toContain('Active');
  });

  it('status returns inactive when no project set', async () => {
    const result = await callTool({ action: 'status' });
    const data = JSON.parse(result.content[0].text);
    expect(data.active).toBe(false);
  });

  it('list shows status from state.md first line', async () => {
    fs.writeFileSync(projectsPath, JSON.stringify({
      version: 1,
      projects: [{ name: 'test', path: projectDir }],
    }));
    fs.mkdirSync(path.join(projectDir, '.project'), { recursive: true });
    fs.writeFileSync(path.join(projectDir, '.project', 'state.md'), '# Project State\n\nWorking on terrain system');

    const result = await callTool({ action: 'list' });
    const data = JSON.parse(result.content[0].text);
    expect(data.projects[0].status).toBe('Working on terrain system');
  });

  it('unknown action returns error', async () => {
    const result = await callTool({ action: 'bogus' });
    expect(result.isError).toBe(true);
  });
});
