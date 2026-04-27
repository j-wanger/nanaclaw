---
title: "src/modules/scheduling/actions.ts"
aliases: []
category: files
tags: [typescript, scheduling, actions]
parents: [src-modules-scheduling]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/modules/scheduling/actions.ts"
content_hash: "0b5abda9fa7067c4"
exports: [handleScheduleTask, handleCancelTask, handlePauseTask, handleResumeTask, handleUpdateTask]
imports: ["src/container-runner.ts", "src/db/sessions.ts", "src/log.ts", "src/session-manager.ts", "src/types.ts", "src/modules/scheduling/db.ts"]
imported_by: ["src/modules/scheduling/index.ts"]
data_reads: []
data_writes: []
---

# src/modules/scheduling/actions.ts

Delivery action handlers for scheduling operations. Each handler processes a scheduling command from an agent container and persists the result.

## Exports

- `handleScheduleTask(payload)` -- create a new scheduled task
- `handleCancelTask(payload)` -- cancel an existing task
- `handlePauseTask(payload)` -- pause a task (skip runs until resumed)
- `handleResumeTask(payload)` -- resume a paused task
- `handleUpdateTask(payload)` -- modify task schedule or parameters

## Dependencies

**Internal:**
- [[src-container-runner|container-runner.ts]] -- container context
- [[src-db-sessions|sessions.ts]] -- session lookups
- [[src-log|log.ts]], [[src-types|types.ts]]
- [[src-session-manager|session-manager.ts]] -- session operations
- [[src-modules-scheduling-db|scheduling/db.ts]] -- task persistence

## Dependents

- [[src-modules-scheduling-index|scheduling/index.ts]] -- registers handlers

## Key Logic

- Each handler validates the payload, persists the change via scheduling/db, and returns a response to the container.
- Tasks are scoped to sessions, so cancelling a session also cancels its tasks.
