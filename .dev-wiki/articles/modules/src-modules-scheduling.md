---
title: "src/modules/scheduling/"
aliases: []
category: modules
tags: [typescript]
parents: [src]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: module
path: "src/modules/scheduling/"
files: [src-modules-scheduling-actions, src-modules-scheduling-db, src-modules-scheduling-index, src-modules-scheduling-recurrence]
external_deps: [cron-parser]
internal_deps: [src-db]
dependents: [src]
content_hash: "d2aade0a8b2a47d0"
---

# src/modules/scheduling/

Durable task scheduling module providing delivery action handlers for schedule, cancel, pause, and resume operations with recurrence parsing.

## Files

[[src-modules-scheduling-actions]], [[src-modules-scheduling-db]], [[src-modules-scheduling-recurrence]], [[src-modules-scheduling-index]]

## Key Patterns

- Delivery action handlers registered into `src/delivery.ts` via action registry
- `recurrence.ts` wraps `cron-parser` for recurring schedule support

## Dependencies

**Internal:** [[src-db]], `src/session-manager.ts`, `src/container-runner.ts`

**External:** `cron-parser`

## Dependents

[[src]] (via delivery action registry)
