---
title: "container/agent-runner/src/db/messages-out.ts"
aliases: []
category: files
tags: [typescript]
parents: [container-agent-runner-src-db]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "container/agent-runner/src/db/messages-out.ts"
content_hash: "f392e630150b823a"
exports: [writeMessageOut, getMessageIdBySeq, getRoutingBySeq]
imports: ["container/agent-runner/src/db/connection.ts"]
imported_by: ["container/agent-runner/src/poll-loop.ts", "container/agent-runner/src/mcp-tools/core.ts", "container/agent-runner/src/mcp-tools/scheduling.ts", "container/agent-runner/src/mcp-tools/agents.ts", "container/agent-runner/src/mcp-tools/interactive.ts", "container/agent-runner/src/mcp-tools/self-mod.ts"]
data_reads: []
data_writes: []
---

# container/agent-runner/src/db/messages-out.ts

Writes outbound messages to outbound.db. Provides sequence-based lookups for message ID and routing information.

## Exports

- `writeMessageOut(message)` -- inserts a message into the outbound queue
- `getMessageIdBySeq(seq)` -- retrieves message ID by sequence number
- `getRoutingBySeq(seq)` -- retrieves routing info by sequence number

## Dependencies

**Internal:**
- [[container-agent-runner-src-db-connection|connection.ts]] -- `getOutDb` for write access to outbound.db

## Dependents

[[container-agent-runner-src-poll-loop|poll-loop.ts]], [[container-agent-runner-src-mcp-tools-core|mcp-tools/core.ts]], [[container-agent-runner-src-mcp-tools-scheduling|mcp-tools/scheduling.ts]], [[container-agent-runner-src-mcp-tools-agents|mcp-tools/agents.ts]], [[container-agent-runner-src-mcp-tools-interactive|mcp-tools/interactive.ts]], [[container-agent-runner-src-mcp-tools-self-mod|mcp-tools/self-mod.ts]]

## Key Logic

- Central write path for all container-to-host communication.
- Sequence numbers provide ordering guarantees for the host delivery system.
