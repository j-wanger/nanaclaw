---
title: "src/db/"
aliases: []
category: modules
tags: [typescript]
parents: [src]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: module
path: "src/db/"
files: [src-db-agent-groups, src-db-connection, src-db-dropped-messages, src-db-index, src-db-messaging-groups, src-db-migrations-index, src-db-schema, src-db-session-db, src-db-sessions]
external_deps: [better-sqlite3]
internal_deps: []
dependents: [src, src-modules-permissions, src-modules-approvals, src-modules-scheduling]
content_hash: "b2fa9cf914436e3d"
---

# src/db/

Central database layer providing connection management, schema definitions, CRUD operations for all central entities, and migration infrastructure.

## Files

[[src-db-connection]], [[src-db-schema]], [[src-db-session-db]], [[src-db-sessions]], [[src-db-agent-groups]], [[src-db-messaging-groups]], [[src-db-dropped-messages]], [[src-db-index]], [[src-db-migrations-index]]

## Key Patterns

- Standalone module with no internal dependencies outside `db/`
- Migration naming: `001-initial` through `013-approval-render-metadata` plus 3 module migrations
- `connection.ts` exposes `initDb`/`getDb` as the single access point

## Dependencies

**Internal:** None (standalone)

**External:** `better-sqlite3`

## Dependents

[[src]], [[src-modules-permissions]], [[src-modules-approvals]], [[src-modules-scheduling]]
