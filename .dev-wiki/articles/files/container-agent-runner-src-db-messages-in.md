---
title: "container/agent-runner/src/db/messages-in.ts"
aliases: []
category: files
tags: [typescript]
parents: [container-agent-runner-src-db]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "container/agent-runner/src/db/messages-in.ts"
content_hash: "b2bf525f03129659"
exports: [getPendingMessages, markProcessing, markCompleted, MessageInRow]
imports: ["container/agent-runner/src/db/connection.ts"]
imported_by: ["container/agent-runner/src/poll-loop.ts", "container/agent-runner/src/mcp-tools/interactive.ts"]
data_reads: []
data_writes: []
---

# container/agent-runner/src/db/messages-in.ts

Reads pending inbound messages from inbound.db and manages their processing lifecycle (pending -> processing -> completed).

## Exports

- `getPendingMessages()` -- fetches messages with pending status
- `markProcessing(id)` -- transitions a message to processing state
- `markCompleted(id)` -- transitions a message to completed state
- `MessageInRow` -- type for an inbound message row

## Dependencies

**Internal:**
- [[container-agent-runner-src-db-connection|connection.ts]] -- `getInDb` for database access

## Dependents

[[container-agent-runner-src-poll-loop|poll-loop.ts]], [[container-agent-runner-src-mcp-tools-interactive|mcp-tools/interactive.ts]]

## Key Logic

- Three-state lifecycle: pending -> processing -> completed.
- Used by poll-loop for normal message flow and by interactive tool for blocking question/answer.
