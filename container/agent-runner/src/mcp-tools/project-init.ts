import fs from 'fs';
import path from 'path';
import { registerTools } from './server.js';
import type { McpToolDefinition } from './types.js';

function ok(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

function getProjectDir(): string {
  return path.join(process.cwd(), '.project');
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

const STATE_TEMPLATE = (name: string) => `# Project State

project: ${name}
status: planning
current_task: 0
last_updated: ${new Date().toISOString().slice(0, 10)}
blockers: none

## Progress
<!-- Updated as tasks complete -->
`;

export async function initHandler(args: Record<string, unknown>) {
  const name = (args.name as string || '').trim();
  if (!name) return ok('Error: name is required');

  const objective = (args.objective as string || '').trim();
  if (!objective) return ok('Error: objective is required');

  const projectDir = getProjectDir();

  if (fs.existsSync(projectDir)) {
    const statePath = path.join(projectDir, 'state.md');
    try {
      const state = fs.readFileSync(statePath, 'utf8');
      return ok(JSON.stringify({
        exists: true,
        message: 'Project already exists. Returning current state.',
        state,
      }));
    } catch {
      return ok(JSON.stringify({
        exists: true,
        message: 'Project directory exists but state.md is missing.',
      }));
    }
  }

  fs.mkdirSync(projectDir, { recursive: true });
  fs.writeFileSync(path.join(projectDir, 'plan.md'), PLAN_TEMPLATE(name, objective));
  fs.writeFileSync(path.join(projectDir, 'tasks.md'), TASKS_TEMPLATE);
  fs.writeFileSync(path.join(projectDir, 'state.md'), STATE_TEMPLATE(name));

  return ok(JSON.stringify({
    exists: false,
    message: `Project "${name}" initialized.`,
    files: ['plan.md', 'tasks.md', 'state.md'].map((f) => path.join(projectDir, f)),
  }));
}

const tools: McpToolDefinition[] = [
  {
    tool: {
      name: 'project_init',
      description:
        'Initialize a .project/ directory for structured task tracking. If a project already exists, returns the current state instead of overwriting. Use for multi-step coding tasks that need planning and progress tracking.',
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
