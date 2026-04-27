---
title: "container/agent-runner/src/mcp-tools/types.ts"
aliases: []
category: files
tags: [typescript]
parents: [container-agent-runner-src-mcp-tools]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "container/agent-runner/src/mcp-tools/types.ts"
content_hash: "23d597e98220ee15"
exports: [McpToolDefinition, McpServerConfig]
imports: []
imported_by: ["container/agent-runner/src/mcp-tools/server.ts"]
data_reads: []
data_writes: []
---

# container/agent-runner/src/mcp-tools/types.ts

Type definitions for MCP tools and server configuration.

## Exports

- `McpToolDefinition` -- type for defining an MCP tool (name, schema, handler)
- `McpServerConfig` -- type for MCP server configuration

## Dependencies

No dependencies (pure type definitions).

## Dependents

[[container-agent-runner-src-mcp-tools-server|server.ts]]

## Key Logic

- Defines the contract for MCP tool modules: each tool must provide a definition matching `McpToolDefinition`.
- `McpServerConfig` describes external MCP server connections.
