import fs from 'fs';
import os from 'os';
import path from 'path';

import { registerTools } from './server.js';
import type { McpToolDefinition } from './types.js';

export interface ProjectEntry {
  name: string;
  path: string;
  domain?: string;
  description?: string;
  has_dev_wiki?: boolean;
  registered?: string;
}

interface ProjectsFile {
  version: number;
  projects: ProjectEntry[];
}

export interface ActiveProject {
  name: string;
  path: string;
  domain?: string;
  activated_at: string;
}

let activeProject: ActiveProject | null = null;

function ok(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

function err(text: string) {
  return { content: [{ type: 'text' as const, text }], isError: true as const };
}

function projectsJsonPath(): string {
  return process.env.PROJECTS_JSON_PATH || path.join(os.homedir(), '.claude', 'projects.json');
}

export function loadProjects(filePath?: string): ProjectEntry[] {
  const p = filePath ?? projectsJsonPath();
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as ProjectsFile;
    return raw.projects || [];
  } catch {
    return [];
  }
}

function saveProjects(projects: ProjectEntry[], filePath?: string): void {
  const p = filePath ?? projectsJsonPath();
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const data: ProjectsFile = { version: 1, projects };
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
}

export function getActiveProject(): ActiveProject | null {
  return activeProject;
}

export function setActiveProject(project: ActiveProject | null): void {
  activeProject = project;
}

function peekStateFirstLine(projectPath: string): string | null {
  try {
    const content = fs.readFileSync(path.join(projectPath, '.project', 'state.md'), 'utf8');
    const lines = content.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
    for (const line of lines) {
      const trimmed = line.replace(/^##\s*/, '').trim();
      if (trimmed && !trimmed.startsWith('_Updated')) return trimmed;
    }
    return null;
  } catch {
    return null;
  }
}

const PROJECT_TEMPLATE = {
  'state.md': (name: string) => `# Project State

## Current Focus
(describe current work)

## Status
- (list key milestones and their status)

## Next Steps
- (what to do next)

_Updated: ${new Date().toISOString().slice(0, 10)}_
`,
  'lessons.md': () => `# Lessons

_Updated: ${new Date().toISOString().slice(0, 10)}_
`,
  'rules.md': () => `# Project Rules

_Updated: ${new Date().toISOString().slice(0, 10)}_
`,
  'index.md': (name: string, description: string) => `# ${name}

${description}

## Structure
- [state.md](state.md) — Current focus and next steps
- [decisions/](decisions/) — Design decision records
- [lessons.md](lessons.md) — Accumulated project insights
- [rules.md](rules.md) — Project conventions
`,
};

async function handleActivate(args: Record<string, unknown>) {
  const projectName = (args.project as string || '').trim();
  if (!projectName) return err('project name is required');

  const projects = loadProjects();
  const entry = projects.find((p) => p.name === projectName);
  if (!entry) {
    const names = projects.map((p) => p.name).join(', ');
    return err(`Project "${projectName}" not found. Registered: ${names || '(none)'}`);
  }

  if (!fs.existsSync(entry.path)) {
    return err(`Project path does not exist: ${entry.path}`);
  }

  activeProject = {
    name: entry.name,
    path: entry.path,
    domain: entry.domain,
    activated_at: new Date().toISOString(),
  };

  const projectDir = path.join(entry.path, '.project');
  let state: string | null = null;
  try {
    state = fs.readFileSync(path.join(projectDir, 'state.md'), 'utf8');
  } catch { /* no .project/ yet */ }

  const hasDevWiki = fs.existsSync(path.join(entry.path, '.dev-wiki'));

  return ok(JSON.stringify({
    activated: entry.name,
    path: entry.path,
    domain: entry.domain,
    description: entry.description,
    has_project: fs.existsSync(projectDir),
    has_dev_wiki: hasDevWiki,
    state,
  }));
}

async function handleStatus(_args: Record<string, unknown>) {
  if (!activeProject) return ok(JSON.stringify({ active: false, message: 'No project activated this session.' }));

  const projectDir = path.join(activeProject.path, '.project');
  let state: string | null = null;
  try {
    state = fs.readFileSync(path.join(projectDir, 'state.md'), 'utf8');
  } catch { /* no state */ }

  const hasDevWiki = fs.existsSync(path.join(activeProject.path, '.dev-wiki'));

  return ok(JSON.stringify({
    active: true,
    name: activeProject.name,
    path: activeProject.path,
    domain: activeProject.domain,
    has_dev_wiki: hasDevWiki,
    state,
  }));
}

async function handleInit(args: Record<string, unknown>) {
  const projectName = (args.project as string || '').trim();
  const projectPath = (args.path as string || '').trim();
  const domain = (args.domain as string || '').trim() || undefined;
  const description = (args.description as string || '').trim() || undefined;

  if (!projectName) return err('project name is required');
  if (!projectPath) return err('path is required');

  if (!fs.existsSync(projectPath)) {
    return err(`Path does not exist: ${projectPath}`);
  }

  const projects = loadProjects();
  const existing = projects.find((p) => p.name === projectName);

  const projectDir = path.join(projectPath, '.project');
  const created: string[] = [];

  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'decisions'), { recursive: true });
    fs.writeFileSync(path.join(projectDir, 'state.md'), PROJECT_TEMPLATE['state.md'](projectName));
    fs.writeFileSync(path.join(projectDir, 'lessons.md'), PROJECT_TEMPLATE['lessons.md']());
    fs.writeFileSync(path.join(projectDir, 'rules.md'), PROJECT_TEMPLATE['rules.md']());
    fs.writeFileSync(path.join(projectDir, 'index.md'), PROJECT_TEMPLATE['index.md'](projectName, description || ''));
    created.push('.project/state.md', '.project/decisions/', '.project/lessons.md', '.project/rules.md', '.project/index.md');
  }

  if (!existing) {
    projects.push({
      name: projectName,
      path: projectPath,
      domain,
      description,
      registered: new Date().toISOString().slice(0, 10),
    });
    saveProjects(projects);
  }

  activeProject = {
    name: projectName,
    path: projectPath,
    domain,
    activated_at: new Date().toISOString(),
  };

  return ok(JSON.stringify({
    project: projectName,
    path: projectPath,
    registered: !existing,
    files_created: created,
    activated: true,
  }));
}

async function handleList(_args: Record<string, unknown>) {
  const projects = loadProjects();

  const list = projects.map((p) => {
    const hasProject = fs.existsSync(path.join(p.path, '.project'));
    const hasDevWiki = p.has_dev_wiki || fs.existsSync(path.join(p.path, '.dev-wiki'));
    const status = peekStateFirstLine(p.path);
    return {
      name: p.name,
      path: p.path,
      domain: p.domain,
      description: p.description,
      has_dev_wiki: hasDevWiki,
      has_project: hasProject,
      is_active: activeProject?.name === p.name,
      status,
    };
  });

  return ok(JSON.stringify({ projects: list, active: activeProject?.name || null }));
}

async function handler(args: Record<string, unknown>) {
  const action = (args.action as string || '').trim();

  switch (action) {
    case 'activate': return handleActivate(args);
    case 'status': return handleStatus(args);
    case 'init': return handleInit(args);
    case 'list': return handleList(args);
    default: return err(`Unknown action: "${action}". Use: activate, status, init, list`);
  }
}

const tools: McpToolDefinition[] = [
  {
    tool: {
      name: 'project_context',
      description:
        'Manage project context. Actions: "activate" (set active project from registry), "status" (get current active project + state), "init" (create .project/ knowledge layer and register), "list" (show all registered projects with status).',
      inputSchema: {
        type: 'object' as const,
        properties: {
          action: {
            type: 'string',
            enum: ['activate', 'status', 'init', 'list'],
            description: 'Action to perform',
          },
          project: {
            type: 'string',
            description: 'Project name (required for activate and init)',
          },
          path: {
            type: 'string',
            description: 'Filesystem path (required for init)',
          },
          domain: {
            type: 'string',
            description: 'Domain wiki name to link (optional, for init)',
          },
          description: {
            type: 'string',
            description: 'Project description (optional, for init)',
          },
        },
        required: ['action'],
      },
    },
    handler,
  },
];

registerTools(tools);
