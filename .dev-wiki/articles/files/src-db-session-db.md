---
title: "src/db/session-db.ts"
aliases: []
category: files
tags: [typescript, database, session]
parents: [src-db]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/db/session-db.ts"
content_hash: "27a8caf9b7006140"
exports: [ensureSchema, openInboundDb, openOutboundDb, insertMessage, upsertSessionRouting, migrateMessagesInTable, migrateDeliveredTable, getDueOutboundMessages, getDeliveredIds, markDelivered, markDeliveryFailed, syncProcessingAcks, countDueMessages, getProcessingClaims, getContainerState, getMessageForRetry, markMessageFailed, retryWithBackoff]
imports: ["better-sqlite3", "src/db/schema.ts"]
imported_by: ["src/session-manager.ts", "src/delivery.ts", "src/host-sweep.ts"]
data_reads: []
data_writes: []
---

# src/db/session-db.ts

Session-level database operations for inbound and outbound message handling. Manages per-session SQLite databases for message storage, delivery tracking, and retry logic.

## Exports

- `openInboundDb(path)` / `openOutboundDb(path)` -- open per-session databases
- `insertMessage(db, msg)` -- insert a message into inbound or outbound
- `getDueOutboundMessages(db)` -- fetch messages ready for delivery
- `markDelivered(db, id)` / `markDeliveryFailed(db, id, reason)` -- delivery status
- `syncProcessingAcks(db)` -- synchronize processing acknowledgments
- `retryWithBackoff(db, id)` -- retry failed messages with exponential backoff
- `getContainerState(db)` -- read container state from session DB
- Plus: `ensureSchema`, `upsertSessionRouting`, migration helpers, `countDueMessages`, `getProcessingClaims`, `getMessageForRetry`, `markMessageFailed`

## Dependencies

**External:** `better-sqlite3`
**Internal:** [[src-db-schema|schema.ts]] -- `INBOUND_SCHEMA`, `OUTBOUND_SCHEMA`

## Dependents

- [[src-session-manager|session-manager.ts]], [[src-delivery|delivery.ts]], [[src-host-sweep|host-sweep.ts]]

## Key Logic

- Each session has its own inbound.db and outbound.db for message isolation.
- Retry uses exponential backoff to avoid overwhelming failed channels.
- Delivery tracking separates "due" from "delivered" for reliable at-least-once delivery.
