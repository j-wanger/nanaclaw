---
title: "container/agent-runner/src/mcp-tools/interactive.ts"
aliases: []
category: files
tags: [typescript]
parents: [container-agent-runner-src-mcp-tools]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "container/agent-runner/src/mcp-tools/interactive.ts"
content_hash: "c419e3996012d484"
exports: [askUserQuestion]
imports: ["container/agent-runner/src/db/messages-out.ts", "container/agent-runner/src/db/messages-in.ts", "container/agent-runner/src/mcp-tools/server.ts", "container/agent-runner/src/destinations.ts"]
imported_by: ["container/agent-runner/src/mcp-tools/index.ts"]
data_reads: []
data_writes: []
---

# container/agent-runner/src/mcp-tools/interactive.ts

Interactive MCP tool that allows the agent to ask the user a question and block until a real reply is received.

## Exports

- `askUserQuestion(params)` -- sends a question and waits for the user's reply

## Dependencies

**Internal:**
- [[container-agent-runner-src-db-messages-out|messages-out.ts]] -- `writeMessageOut` for sending the question
- [[container-agent-runner-src-db-messages-in|messages-in.ts]] -- `getPendingMessages` for polling the reply
- [[container-agent-runner-src-mcp-tools-server|server.ts]] -- MCP server registration
- [[container-agent-runner-src-destinations|destinations.ts]] -- destination resolution

## Dependents

[[container-agent-runner-src-mcp-tools-index|mcp-tools/index.ts]]

## Key Logic

- Persists the question via messages_out, then polls messages_in for the user's reply.
- Blocking behavior: the tool call does not return until a reply arrives.
- Enables human-in-the-loop workflows within the agent's execution.
