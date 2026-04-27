---
title: "container/agent-runner/src/mcp-tools/scheduling.ts"
aliases: []
category: files
tags: [typescript]
parents: [container-agent-runner-src-mcp-tools]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "container/agent-runner/src/mcp-tools/scheduling.ts"
content_hash: "444047f17b590da5"
exports: [scheduleTask, cancelTask, pauseTask, resumeTask, updateTask, listTasks]
imports: ["container/agent-runner/src/db/messages-out.ts", "container/agent-runner/src/mcp-tools/server.ts", "container/agent-runner/src/destinations.ts"]
imported_by: ["container/agent-runner/src/mcp-tools/index.ts"]
data_reads: []
data_writes: []
---

# container/agent-runner/src/mcp-tools/scheduling.ts

Scheduling MCP tools that allow the agent to manage scheduled tasks. All operations write system actions to messages_out for host-side execution.

## Exports

- `scheduleTask(params)` -- creates a new scheduled task
- `cancelTask(params)` -- cancels an existing scheduled task
- `pauseTask(params)` -- pauses a scheduled task
- `resumeTask(params)` -- resumes a paused task
- `updateTask(params)` -- modifies a scheduled task
- `listTasks()` -- lists all scheduled tasks

## Dependencies

**Internal:**
- [[container-agent-runner-src-db-messages-out|messages-out.ts]] -- `writeMessageOut` for system actions
- [[container-agent-runner-src-mcp-tools-server|server.ts]] -- MCP server registration
- [[container-agent-runner-src-destinations|destinations.ts]] -- destination resolution

## Dependents

[[container-agent-runner-src-mcp-tools-index|mcp-tools/index.ts]]

## Key Logic

- Full CRUD for scheduled tasks via MCP tool interface.
- Writes system action messages that the host interprets as scheduling commands.
