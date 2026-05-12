import fs from 'fs';
import path from 'path';
import { registerTools } from './server.js';
import { getActiveProject } from './project-context.js';
import type { McpToolDefinition } from './types.js';

function ok(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

function getWorkDir(): string {
  const active = getActiveProject();
  const base = active ? active.path : process.cwd();
  return path.join(base, '.project', 'work');
}

const PLAN_TEMPLATE = (name: string, objective: string) => `# Project: ${name}

## Objective
${objective}

## Approach
<!-- Describe how you'll build this -->

## Scope
<!-- List files and modules affected -->
`;

const TASKS_TEMPLATE = `# Tasks

<!-- Add tasks in order. Each task needs description, scope, and success criterion. -->
<!-- - [ ] Description | scope: src/*.ts | success: \`command\` -->
`;

const PROGRESS_TEMPLATE = (name: string) => `# Progress

project: ${name}
status: planning
current_task: 0
last_updated: ${new Date().toISOString().slice(0, 10)}
blockers: none

## Log
<!-- Updated as tasks complete -->
`;

export async function initHandler(args: Record<string, unknown>) {
  const name = (args.name as string || '').trim();
  if (!name) return ok('Error: name is required');

  const objective = (args.objective as string || '').trim();
  if (!objective) return ok('Error: objective is required');

  const workDir = getWorkDir();

  if (fs.existsSync(workDir)) {
    const progressPath = path.join(workDir, 'progress.md');
    try {
      const progress = fs.readFileSync(progressPath, 'utf8');
      return ok(JSON.stringify({
        exists: true,
        message: 'Work directory already exists. Returning current progress.',
        progress,
      }));
    } catch {
      return ok(JSON.stringify({
        exists: true,
        message: 'Work directory exists but progress.md is missing.',
      }));
    }
  }

  fs.mkdirSync(workDir, { recursive: true });
  fs.writeFileSync(path.join(workDir, 'plan.md'), PLAN_TEMPLATE(name, objective));
  fs.writeFileSync(path.join(workDir, 'tasks.md'), TASKS_TEMPLATE);
  fs.writeFileSync(path.join(workDir, 'progress.md'), PROGRESS_TEMPLATE(name));

  return ok(JSON.stringify({
    exists: false,
    message: `Work initialized for "${name}".`,
    files: ['plan.md', 'tasks.md', 'progress.md'].map((f) => path.join(workDir, f)),
  }));
}

const tools: McpToolDefinition[] = [
  {
    tool: {
      name: 'project_init',
      description:
        'Initialize .project/work/ for structured task tracking on the active project. If work/ already exists, returns the current progress instead of overwriting. The knowledge layer (.project/ root) is managed by project_context — this tool only creates the ephemeral task-tracking layer.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          name: { type: 'string', description: 'Project name (short, descriptive)' },
          objective: { type: 'string', description: 'One-line goal for the project' },
        },
        required: ['name', 'objective'],
      },
    },
    handler: initHandler,
  },
];

registerTools(tools);
