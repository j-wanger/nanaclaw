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
- [PROTOCOL.md](PROTOCOL.md) — Task execution protocol for implementers
`,
  'PROTOCOL.md': () => `# Task Protocol

Tasks in \`.project/work/tasks.md\` are planned externally.
Do not restructure tasks or add new ones without instruction.

## Session Start
1. Read \`.project/state.md\` and \`decisions/\` for project context
2. Read \`.project/rules.md\` for project-specific constraints
3. If \`.project/work/\` exists:
   - Read \`progress.md\` for current position
   - Read \`tasks.md\` for the task list
   - Find the next uncompleted task (marked \`[ ]\`)
   - State which task you are working on

## Working
- Work tasks in order — do not skip or reorder
- Each task may have a \`success:\` field — run it to verify before marking done
- Mark completed tasks \`[x]\` in tasks.md
- Update progress.md after each task (increment current_task, note what was done)
- Commit meaningful changes after each completed task

## Blocked
After 3 failed attempts on a task:
1. Mark it \`[blocked: reason]\` in tasks.md
2. Update progress.md with blocker details
3. Ask the user whether to skip or stop

## All Tasks Done
1. Update progress.md status to \`complete\`
2. Update \`.project/state.md\` with what was accomplished
3. Report completion
4. Do NOT delete \`.project/\` or \`.project/work/\`

## Compaction Recovery
1. Read \`.project/work/progress.md\` for current position
2. Read \`.project/work/tasks.md\` for next uncompleted task
3. State: "Resuming task N: <description>"
4. Continue from that task
`,
};

const CLAUDE_RULES_POINTER = (name: string) => `# Project Context — ${name}

This project uses \`.project/\` for knowledge and task management.
At session start, read \`.project/state.md\` for status. If \`.project/work/\`
exists, follow the protocol in \`.project/PROTOCOL.md\`.
`;

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
    fs.writeFileSync(path.join(projectDir, 'PROTOCOL.md'), PROJECT_TEMPLATE['PROTOCOL.md']());
    created.push('.project/state.md', '.project/decisions/', '.project/lessons.md', '.project/rules.md', '.project/index.md', '.project/PROTOCOL.md');

    const rulesDir = path.join(projectPath, '.claude', 'rules');
    if (!fs.existsSync(rulesDir)) fs.mkdirSync(rulesDir, { recursive: true });
    const rulesFile = path.join(rulesDir, 'project-context.md');
    if (!fs.existsSync(rulesFile)) {
      fs.writeFileSync(rulesFile, CLAUDE_RULES_POINTER(projectName));
      created.push('.claude/rules/project-context.md');
    }
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
