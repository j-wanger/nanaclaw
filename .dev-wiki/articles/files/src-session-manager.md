---
title: "src/session-manager.ts"
aliases: []
category: files
tags: [typescript]
parents: [src]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/session-manager.ts"
content_hash: "44243908fd20ea99"
exports: [resolveSession, writeSessionMessage, writeSessionRouting, writeOutboundDirect, writeSystemResponse, openInboundDb, openOutboundDb, readOutboxFiles, clearOutbox, markContainerRunning, markContainerIdle, markContainerStopped, sessionDir, sessionsBaseDir, inboundDbPath, outboundDbPath, heartbeatPath, initSessionFolder]
imports: ["src/channels/adapter.ts", "src/config.ts", "src/db/messaging-groups.ts", "src/db/sessions.ts", "src/db/session-db.ts", "src/log.ts", "src/types.ts"]
imported_by: ["src/router.ts", "src/delivery.ts", "src/host-sweep.ts", "src/modules/scheduling/actions.ts"]
data_reads: []
data_writes: []
---

# src/session-manager.ts

Session lifecycle manager handling folder creation, per-session DB initialization, message writing, container status tracking, and routing. Implements a two-DB split with `inbound.db` (host writes) and `outbound.db` (container writes).

## Exports

- `resolveSession(group, sender)` -- finds or creates a session
- `writeSessionMessage(session, msg)` -- writes to inbound.db
- `writeSessionRouting(session, routing)` -- writes routing info
- `writeOutboundDirect(session, msg)` -- writes directly to outbound
- `writeSystemResponse(session, msg)` -- writes system-generated response
- `openInboundDb(session)` / `openOutboundDb(session)` -- DB accessors
- `readOutboxFiles(session)` / `clearOutbox(session)` -- outbox file management
- `markContainerRunning(s)` / `markContainerIdle(s)` / `markContainerStopped(s)` -- status
- `sessionDir(s)` / `inboundDbPath(s)` / `outboundDbPath(s)` / `heartbeatPath(s)` -- paths
- `sessionsBaseDir()` -- base directory for all sessions
- `initSessionFolder(session)` -- creates session directory structure

## Dependencies

**Internal:**
- [[src-config|config.ts]] -- `DATA_DIR` for session paths
- [[src-db-sessions|sessions.ts]] -- session record CRUD
- [[src-db-session-db|session-db.ts]] -- per-session DB schema
- [[src-log|log.ts]] -- structured logging

## Dependents

[[src-router|router.ts]], [[src-delivery|delivery.ts]], [[src-host-sweep|host-sweep.ts]]

## Key Logic

- Cross-mount invariant: `journal_mode=DELETE`, open-write-close per operation to avoid SQLite lock conflicts between host and container processes.
- Two-DB split isolates host writes (inbound.db) from container writes (outbound.db).
