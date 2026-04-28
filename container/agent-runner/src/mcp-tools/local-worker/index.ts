import { registerTools } from '../server.js';
import type { McpToolDefinition } from '../types.js';
import { handleDispatchWorker, handleGetWorkerStatus, handleCancelWorker } from './tools.js';

const tools: McpToolDefinition[] = [
  {
    tool: {
      name: 'dispatch_worker',
      description:
        'Dispatch a task to the local Qwen worker. Returns immediately with a task ID. ' +
        'Results auto-surface via the poll loop when the worker completes. ' +
        'Use for code implementation, research, structured output, and file operations.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          type: {
            type: 'string',
            enum: ['file-op', 'code-impl', 'research', 'structured-output'],
            description: 'Task type',
          },
          objective: { type: 'string', description: 'What the worker should produce' },
          outputFormat: {
            type: 'string',
            enum: ['json', 'code', 'markdown'],
            description: 'Expected output format',
          },
          context: { type: 'string', description: 'Relevant code, docs, or data for the worker' },
          boundaries: {
            type: 'array',
            items: { type: 'string' },
            description: 'What the worker should NOT do',
          },
          postconditions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['json-valid', 'contains', 'regex', 'line-count'] },
                params: { type: 'object' },
              },
            },
            description: 'T0 deterministic checks to verify the result',
          },
          timeout_ms: { type: 'number', description: 'Timeout in milliseconds (default: 60000)' },
          context_budget_tokens: {
            type: 'number',
            description: 'Max tokens for worker context (default: 4096, sweet spot: 4096-8192)',
          },
          tools: {
            type: 'array',
            items: { type: 'string' },
            description: 'MCP tool names the worker can call (enables multi-turn agent loop). Omit for single-shot.',
          },
          max_iterations: {
            type: 'number',
            description: 'Max inference iterations for tool-calling workers (default: 10). Higher for research tasks, lower for simple lookups.',
          },
          write_to: {
            type: 'object',
            properties: {
              wiki: { type: 'string', description: 'Target wiki name' },
              tier: { type: 'string', enum: ['episodic', 'review'], description: 'Output routing tier' },
              title: { type: 'string', description: 'Article title (episodic tier)' },
              tags: { type: 'array', items: { type: 'string' }, description: 'Article tags (episodic tier)' },
              target_path: { type: 'string', description: 'Path to article being reviewed (review tier)' },
            },
            required: ['wiki', 'tier'],
            description: 'Auto-route worker output to wiki. Episodic: writes article. Review: updates target status.',
          },
        },
        required: ['objective', 'outputFormat'],
      },
    },
    handler: handleDispatchWorker,
  },
  {
    tool: {
      name: 'get_worker_status',
      description: 'Check status of one or all worker tasks. Omit task_id to list all.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          task_id: { type: 'string', description: 'Task ID to check (omit for all)' },
        },
      },
    },
    handler: handleGetWorkerStatus,
  },
  {
    tool: {
      name: 'cancel_worker',
      description: 'Cancel a pending worker task.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          task_id: { type: 'string', description: 'Task ID to cancel' },
        },
        required: ['task_id'],
      },
    },
    handler: handleCancelWorker,
  },
];

registerTools(tools);
