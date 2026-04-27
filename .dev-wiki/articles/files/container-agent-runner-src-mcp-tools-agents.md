---
title: "container/agent-runner/src/mcp-tools/agents.ts"
aliases: []
category: files
tags: [typescript]
parents: [container-agent-runner-src-mcp-tools]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "container/agent-runner/src/mcp-tools/agents.ts"
content_hash: "0d28c6d90d15ac20"
exports: [createAgent, listAgents]
imports: ["container/agent-runner/src/db/messages-out.ts", "container/agent-runner/src/mcp-tools/server.ts", "container/agent-runner/src/destinations.ts"]
imported_by: ["container/agent-runner/src/mcp-tools/index.ts"]
data_reads: []
data_writes: []
---

# container/agent-runner/src/mcp-tools/agents.ts

Agent management MCP tools that allow an agent to create child agents and list existing agents.

## Exports

- `createAgent(params)` -- creates a new agent instance
- `listAgents()` -- lists available agents

## Dependencies

**Internal:**
- [[container-agent-runner-src-db-messages-out|messages-out.ts]] -- `writeMessageOut` for system actions
- [[container-agent-runner-src-mcp-tools-server|server.ts]] -- MCP server registration
- [[container-agent-runner-src-destinations|destinations.ts]] -- destination resolution

## Dependents

[[container-agent-runner-src-mcp-tools-index|mcp-tools/index.ts]]

## Key Logic

- Agent creation writes a system action for the host to spawn a new container.
- Enables multi-agent workflows where agents can delegate to child agents.
