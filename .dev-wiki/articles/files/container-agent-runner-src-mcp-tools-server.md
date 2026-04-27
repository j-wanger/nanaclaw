---
title: "container/agent-runner/src/mcp-tools/server.ts"
aliases: []
category: files
tags: [typescript]
parents: [container-agent-runner-src-mcp-tools]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "container/agent-runner/src/mcp-tools/server.ts"
content_hash: "643e08b917dd4b5b"
exports: [registerTools, getMcpServer]
imports: ["container/agent-runner/src/mcp-tools/types.ts"]
imported_by: ["container/agent-runner/src/mcp-tools/core.ts", "container/agent-runner/src/mcp-tools/scheduling.ts", "container/agent-runner/src/mcp-tools/agents.ts", "container/agent-runner/src/mcp-tools/interactive.ts", "container/agent-runner/src/mcp-tools/self-mod.ts"]
data_reads: []
data_writes: []
---

# container/agent-runner/src/mcp-tools/server.ts

MCP server setup and tool registration. Creates a stdio-based MCP server and provides a helper for registering tool definitions.

## Exports

- `registerTools(tools)` -- registers tool definitions with the MCP server
- `getMcpServer()` -- returns the singleton MCP server instance

## Dependencies

**Internal:**
- [[container-agent-runner-src-mcp-tools-types|types.ts]] -- `McpToolDefinition`, `McpServerConfig`

**External:**
- `@modelcontextprotocol/sdk` -- MCP protocol SDK

## Dependents

All mcp-tools files: [[container-agent-runner-src-mcp-tools-core|core.ts]], [[container-agent-runner-src-mcp-tools-scheduling|scheduling.ts]], [[container-agent-runner-src-mcp-tools-agents|agents.ts]], [[container-agent-runner-src-mcp-tools-interactive|interactive.ts]], [[container-agent-runner-src-mcp-tools-self-mod|self-mod.ts]]

## Key Logic

- Creates a stdio-based MCP server (communicates over stdin/stdout).
- Singleton pattern: all tool modules register against the same server instance.
- Provides the `registerTools` helper used by every tool module.
