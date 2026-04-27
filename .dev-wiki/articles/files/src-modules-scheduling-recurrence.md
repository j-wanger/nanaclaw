---
title: "src/modules/scheduling/recurrence.ts"
aliases: []
category: files
tags: [typescript, scheduling, cron]
parents: [src-modules-scheduling]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/modules/scheduling/recurrence.ts"
content_hash: "69bcb304f681bbf0"
exports: [nextRun, isValidCron]
imports: ["cron-parser"]
imported_by: ["src/host-sweep.ts", "src/modules/scheduling/index.ts"]
data_reads: []
data_writes: []
---

# src/modules/scheduling/recurrence.ts

Cron expression parsing and next-run calculation for recurring scheduled tasks.

## Exports

- `nextRun(cronExpr, after?)` -- calculates the next run time from a cron expression
- `isValidCron(expr)` -- validates a cron expression string

## Dependencies

**External:** `cron-parser` -- cron expression parser

## Dependents

- [[src-host-sweep|host-sweep.ts]] -- calculates next run times during sweep
- [[src-modules-scheduling-index|scheduling/index.ts]] -- validates cron expressions at registration

## Key Logic

- Wraps `cron-parser` to provide a simple interface for the scheduling system.
- `nextRun` accepts an optional `after` timestamp for calculating future run times.
- `isValidCron` provides pre-validation before persisting task schedules.
