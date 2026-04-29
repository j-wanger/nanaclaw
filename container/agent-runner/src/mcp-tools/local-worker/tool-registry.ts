import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { getRegisteredTool } from '../server.js';

export interface WorkerToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolRegistryResult {
  definitions: WorkerToolDefinition[];
  errors: string[];
}

function stripMcpPrefix(name: string): string {
  return name.replace(/^mcp__[^_]+__/, '');
}

export function buildToolDefinitions(allowedTools: string[]): ToolRegistryResult {
  if (!allowedTools || allowedTools.length === 0) {
    return { definitions: [], errors: [] };
  }

  const definitions: WorkerToolDefinition[] = [];
  const errors: string[] = [];

  for (const name of allowedTools) {
    const shortName = stripMcpPrefix(name);
    const tool = getRegisteredTool(shortName) || getRegisteredTool(name);
    if (!tool) {
      errors.push(`Unknown tool: "${name}"`);
      continue;
    }

    definitions.push({
      type: 'function',
      function: {
        name: tool.tool.name,
        description: tool.tool.description || '',
        parameters: (tool.tool.inputSchema as Record<string, unknown>) || { type: 'object', properties: {} },
      },
    });
  }

  return { definitions, errors };
}

export async function executeTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
  const shortName = stripMcpPrefix(name);
  const tool = getRegisteredTool(shortName) || getRegisteredTool(name);
  if (!tool) {
    return { content: [{ type: 'text', text: `Error: tool "${name}" not found` }], isError: true };
  }
  return tool.handler(args);
}
