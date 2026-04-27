---
title: "src/webhook-server.ts"
aliases: []
category: files
tags: [typescript]
parents: [src]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/webhook-server.ts"
content_hash: "61bbd7711160d710"
exports: [startWebhookServer, stopWebhookServer]
imports: ["src/log.ts"]
imported_by: []
data_reads: []
data_writes: []
---

# src/webhook-server.ts

HTTP server that receives webhook callbacks from channel adapters.

## Exports

- `startWebhookServer(port, handler)` -- starts the HTTP server on the given port
- `stopWebhookServer()` -- gracefully shuts down the server

## Dependencies

**Internal:**
- [[src-log|log.ts]] -- structured logging

## Dependents

Channel adapters (imported by adapter implementations).
