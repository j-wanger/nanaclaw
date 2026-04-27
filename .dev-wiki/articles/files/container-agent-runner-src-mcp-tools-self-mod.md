---
title: "container/agent-runner/src/mcp-tools/self-mod.ts"
aliases: []
category: files
tags: [typescript]
parents: [container-agent-runner-src-mcp-tools]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "container/agent-runner/src/mcp-tools/self-mod.ts"
content_hash: "fbbe9b0ec559406a"
exports: [installPackages, addMcpServer]
imports: ["container/agent-runner/src/db/messages-out.ts", "container/agent-runner/src/mcp-tools/server.ts"]
imported_by: ["container/agent-runner/src/mcp-tools/index.ts"]
data_reads: []
data_writes: []
---

# container/agent-runner/src/mcp-tools/self-mod.ts

Self-modification MCP tools that allow the agent to request package installations and MCP server additions. Both operations require admin approval before execution.

## Exports

- `installPackages(params)` -- requests installation of packages into the container
- `addMcpServer(params)` -- requests addition of an MCP server to the configuration

## Dependencies

**Internal:**
- [[container-agent-runner-src-db-messages-out|messages-out.ts]] -- `writeMessageOut` for approval requests
- [[container-agent-runner-src-mcp-tools-server|server.ts]] -- MCP server registration

## Dependents

[[container-agent-runner-src-mcp-tools-index|mcp-tools/index.ts]]

## Key Logic

- Both tools write system action messages that require admin approval on the host side.
- install_packages triggers a container image rebuild after approval.
- add_mcp_server updates container.json and restarts the container after approval.
