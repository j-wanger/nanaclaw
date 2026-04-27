---
title: "src/db/dropped-messages.ts"
aliases: []
category: files
tags: [typescript, database, audit]
parents: [src-db]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/db/dropped-messages.ts"
content_hash: "d9fb69e3e024163b"
exports: [recordDroppedMessage]
imports: ["src/db/connection.ts"]
imported_by: ["src/router.ts"]
data_reads: []
data_writes: []
---

# src/db/dropped-messages.ts

Audit logging for messages that are dropped during routing. Records the message and the reason it was not delivered.

## Exports

- `recordDroppedMessage(message, reason)` -- persists a dropped message with its drop reason

## Dependencies

**Internal:** [[src-db-connection|connection.ts]] -- `getDb`

## Dependents

- [[src-router|router.ts]] -- records drops when routing gates reject a message

## Key Logic

- Provides an audit trail for messages that fail access gates, scope gates, or have no valid routing target.
- Single-purpose module for observability into message loss.
