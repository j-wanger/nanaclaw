---
title: "src/state-sqlite.ts"
aliases: []
category: files
tags: [typescript]
parents: [src]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/state-sqlite.ts"
content_hash: "a0d0a3a641d02e08"
exports: [getState, setState]
imports: ["src/db/connection.ts"]
imported_by: []
data_reads: []
data_writes: []
---

# src/state-sqlite.ts

SQLite-backed key-value state helpers for persistent host-level state.

## Exports

- `getState(key)` -- retrieves a value by key from the state table
- `setState(key, value)` -- stores or updates a key-value pair in the state table

## Dependencies

**Internal:**
- [[src-db-connection|connection.ts]] -- `getDb` for database access

## Dependents

`src/channels/chat-sdk-bridge.ts`
