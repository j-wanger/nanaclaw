---
title: "container/agent-runner/src/mcp-tools/core.ts"
aliases: []
category: files
tags: [typescript]
parents: [container-agent-runner-src-mcp-tools]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "container/agent-runner/src/mcp-tools/core.ts"
content_hash: "00df320a9fb501f6"
exports: [sendMessage, sendFile, editMessage, addReaction]
imports: ["container/agent-runner/src/destinations.ts", "container/agent-runner/src/db/messages-out.ts", "container/agent-runner/src/db/session-routing.ts", "container/agent-runner/src/mcp-tools/server.ts"]
imported_by: ["container/agent-runner/src/mcp-tools/index.ts"]
data_reads: []
data_writes: []
---

# container/agent-runner/src/mcp-tools/core.ts

Core MCP tools for agent communication: sending messages, sending files, editing messages, and adding reactions. Resolves destinations by name and writes actions to messages_out.

## Exports

- `sendMessage(params)` -- sends a text message to a destination
- `sendFile(params)` -- sends a file to a destination
- `editMessage(params)` -- edits a previously sent message
- `addReaction(params)` -- adds a reaction to a message

## Dependencies

**Internal:**
- [[container-agent-runner-src-destinations|destinations.ts]] -- `findByName` for destination resolution
- [[container-agent-runner-src-db-messages-out|messages-out.ts]] -- `writeMessageOut` for outbound writes
- [[container-agent-runner-src-db-session-routing|session-routing.ts]] -- `getSessionRouting` for default routing
- [[container-agent-runner-src-mcp-tools-server|server.ts]] -- MCP server registration

## Dependents

[[container-agent-runner-src-mcp-tools-index|mcp-tools/index.ts]]

## Key Logic

- Resolves destination names to platform-specific channel/thread identifiers.
- Falls back to session routing when no explicit destination is provided.
- All actions write to messages_out for host-side delivery.
