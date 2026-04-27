---
title: "container/agent-runner/src/db/connection.ts"
aliases: []
category: files
tags: [typescript]
parents: [container-agent-runner-src-db]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "container/agent-runner/src/db/connection.ts"
content_hash: "050071de680e5691"
exports: [getInDb, getOutDb, touchHeartbeat, clearStaleProcessingAcks, setContainerToolInFlight, clearContainerToolInFlight]
imports: []
imported_by: ["container/agent-runner/src/poll-loop.ts", "container/agent-runner/src/destinations.ts", "container/agent-runner/src/db/messages-in.ts", "container/agent-runner/src/db/messages-out.ts", "container/agent-runner/src/db/session-state.ts", "container/agent-runner/src/db/session-routing.ts", "container/agent-runner/src/providers/claude.ts"]
data_reads: ["/workspace/inbound.db", "/workspace/outbound.db"]
data_writes: ["/workspace/outbound.db"]
---

# container/agent-runner/src/db/connection.ts

Container-side database connection manager. Opens inbound.db in read-only mode and outbound.db in read-write mode, both using journal_mode=DELETE for container filesystem compatibility.

## Exports

- `getInDb()` -- returns read-only connection to inbound.db
- `getOutDb()` -- returns read-write connection to outbound.db
- `touchHeartbeat()` -- updates heartbeat timestamp for liveness monitoring
- `clearStaleProcessingAcks()` -- cleans up stale processing acknowledgements
- `setContainerToolInFlight(toolId)` -- marks a tool call as in-flight
- `clearContainerToolInFlight(toolId)` -- clears in-flight tool state

## Dependencies

**External:**
- `bun:sqlite` -- SQLite driver

## Dependents

Most container files: [[container-agent-runner-src-poll-loop|poll-loop.ts]], [[container-agent-runner-src-destinations|destinations.ts]], [[container-agent-runner-src-db-messages-in|messages-in.ts]], [[container-agent-runner-src-db-messages-out|messages-out.ts]], [[container-agent-runner-src-db-session-state|session-state.ts]], [[container-agent-runner-src-db-session-routing|session-routing.ts]], [[container-agent-runner-src-providers-claude|providers/claude.ts]]

## Key Logic

- Uses journal_mode=DELETE (not WAL) for container filesystem constraints.
- Manages heartbeat touches so the host can detect container liveness.
- Tracks tool-in-flight state for safe shutdown coordination.
