---
title: "src/delivery.ts"
aliases: []
category: files
tags: [typescript]
parents: [src]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/delivery.ts"
content_hash: "0306146ad770a9de"
exports: [startActiveDeliveryPoll, startSweepDeliveryPoll, setDeliveryAdapter, getDeliveryAdapter, onDeliveryAdapterReady, stopDeliveryPolls, ChannelDeliveryAdapter]
imports: ["src/db/sessions.ts", "src/db/agent-groups.ts", "src/db/connection.ts", "src/db/messaging-groups.ts", "src/db/session-db.ts", "src/log.ts", "src/channels/ask-question.ts", "src/session-manager.ts", "src/modules/typing/index.ts", "src/channels/adapter.ts", "src/types.ts"]
imported_by: ["src/index.ts"]
data_reads: []
data_writes: []
---

# src/delivery.ts

Outbound delivery system that polls `outbound.db` for undelivered messages, delivers them through channel adapters, and tracks delivery state.

## Exports

- `startActiveDeliveryPoll()` -- begins polling for active delivery
- `startSweepDeliveryPoll()` -- begins polling for sweep delivery
- `setDeliveryAdapter(adapter)` -- injects channel delivery adapter
- `getDeliveryAdapter()` -- retrieves current delivery adapter
- `onDeliveryAdapterReady(callback)` -- registers callback for adapter readiness
- `stopDeliveryPolls()` -- stops all delivery polling
- `ChannelDeliveryAdapter` -- interface for channel delivery adapters

## Dependencies

**Internal:**
- [[src-db-session-db|session-db.ts]] -- outbound message queries
- [[src-db-sessions|sessions.ts]] -- session state lookups
- [[src-db-messaging-groups|messaging-groups.ts]] -- group resolution
- [[src-session-manager|session-manager.ts]] -- `openOutboundDb`, `readOutboxFiles`
- [[src-log|log.ts]] -- structured logging

## Dependents

[[src-index|index.ts]]

## Key Logic

- Two poll loops: active (frequent) and sweep (less frequent) for different delivery urgencies.
- Reads undelivered messages from outbound.db, dispatches through the injected channel delivery adapter.
- Tracks delivery state to avoid duplicate sends.
