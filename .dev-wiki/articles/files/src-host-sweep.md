---
title: "src/host-sweep.ts"
aliases: []
category: files
tags: [typescript]
parents: [src]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/host-sweep.ts"
content_hash: "a8f438ac1cc315a2"
exports: [startHostSweep, stopHostSweep, decideStuckAction, ABSOLUTE_CEILING_MS, CLAIM_STUCK_MS, StuckDecision]
imports: ["src/db/sessions.ts", "src/db/agent-groups.ts", "src/db/session-db.ts", "src/log.ts", "src/session-manager.ts", "src/container-runner.ts", "src/types.ts"]
imported_by: ["src/index.ts"]
data_reads: []
data_writes: []
---

# src/host-sweep.ts

60-second periodic sweep that syncs `processing_ack`, detects stuck or idle containers via heartbeat mtime and claim age, retries failed messages, and wakes containers for due messages.

## Exports

- `startHostSweep()` -- begins the 60s periodic sweep
- `stopHostSweep()` -- stops the sweep
- `decideStuckAction(session)` -- determines action for a stuck container
- `ABSOLUTE_CEILING_MS` -- maximum time before forced container kill
- `CLAIM_STUCK_MS` -- threshold for claim staleness detection
- `StuckDecision` -- enum/type for stuck action decisions

## Dependencies

**Internal:**
- [[src-db-sessions|sessions.ts]] -- session queries for active/stuck sessions
- [[src-db-session-db|session-db.ts]] -- per-session DB queries
- [[src-session-manager|session-manager.ts]] -- `heartbeatPath`, status markers
- [[src-container-runner|container-runner.ts]] -- `wakeContainer`, `killContainer`
- [[src-log|log.ts]] -- structured logging

## Dependents

[[src-index|index.ts]]

## Key Logic

- Detects stuck containers by comparing heartbeat file mtime against `CLAIM_STUCK_MS` threshold.
- `decideStuckAction` applies escalation logic: retry first, kill after `ABSOLUTE_CEILING_MS`.
- Wakes containers for sessions with unprocessed due messages.
