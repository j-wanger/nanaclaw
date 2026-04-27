---
title: "src/db/connection.ts"
aliases: []
category: files
tags: [typescript, database, sqlite]
parents: [src-db]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/db/connection.ts"
content_hash: "8424fc2673a0c795"
exports: [initDb, initTestDb, getDb, closeDb, hasTable]
imports: ["better-sqlite3"]
imported_by: ["src/index.ts", "src/delivery.ts", "src/host-sweep.ts", "src/container-runner.ts", "src/state-sqlite.ts"]
data_reads: ["data/v2.db"]
data_writes: []
---

# src/db/connection.ts

Central DB connection management for the SQLite-based central database. Opens the database with WAL mode for concurrent read performance.

## Exports

- `initDb()` -- initializes the central database connection (WAL mode)
- `initTestDb()` -- initializes an in-memory database for tests
- `getDb()` -- returns the current database connection
- `closeDb()` -- closes the database connection
- `hasTable(name)` -- checks if a table exists in the database

## Dependencies

**External:**
- `better-sqlite3` -- SQLite driver

## Dependents

- [[src-index|index.ts]] -- calls `initDb` at startup
- [[src-delivery|delivery.ts]] -- reads DB for delivery operations
- [[src-host-sweep|host-sweep.ts]] -- reads DB for sweep operations
- [[src-container-runner|container-runner.ts]] -- reads DB for container state
- [[src-state-sqlite|state-sqlite.ts]] -- reads DB for state operations

## Key Logic

- Single connection pattern: one SQLite connection shared across the process.
- WAL mode enables concurrent reads without blocking writes.
- `hasTable` used for migration checks and feature detection.
