---
title: "src/modules/scheduling/db.ts"
aliases: []
category: files
tags: [typescript, scheduling, database]
parents: [src-modules-scheduling]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/modules/scheduling/db.ts"
content_hash: "11b87df0392bd2f5"
exports: [insertTask, cancelTask, pauseTask, resumeTask, updateTask, listTasks, TaskUpdate]
imports: ["better-sqlite3"]
imported_by: ["src/modules/scheduling/actions.ts"]
data_reads: []
data_writes: []
---

# src/modules/scheduling/db.ts

Database operations for scheduled tasks. Operates on the session's inbound.db to persist task state alongside the session's message data.

## Exports

- `insertTask(db, task)` -- insert a new scheduled task
- `cancelTask(db, taskId)` -- mark a task as cancelled
- `pauseTask(db, taskId)` -- mark a task as paused
- `resumeTask(db, taskId)` -- mark a task as active
- `updateTask(db, taskId, updates)` -- update schedule or parameters
- `listTasks(db, sessionId)` -- list tasks for a session
- `TaskUpdate` -- type for partial task updates

## Dependencies

**External:** `better-sqlite3` -- SQLite driver

## Dependents

- [[src-modules-scheduling-actions|actions.ts]] -- all action handlers use these DB operations

## Key Logic

- Tasks are stored in the session's inbound.db, not the central database, keeping scheduling data co-located with session messages.
- State transitions: active -> paused -> active, active -> cancelled (terminal).
