---
title: "src/response-registry.ts"
aliases: []
category: files
tags: [typescript]
parents: [src]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/response-registry.ts"
content_hash: "0156053d03ea84ee"
exports: [registerResponseHandler, getResponseHandlers, onShutdown, getShutdownCallbacks, ResponsePayload, ResponseHandler]
imports: []
imported_by: ["src/index.ts"]
data_reads: []
data_writes: []
---

# src/response-registry.ts

Response handler and shutdown callback registry, extracted from `index.ts` to break a circular import chain.

## Exports

- `registerResponseHandler(handler)` -- registers a function to handle response payloads
- `getResponseHandlers()` -- retrieves all registered response handlers
- `onShutdown(callback)` -- registers a callback invoked during graceful shutdown
- `getShutdownCallbacks()` -- retrieves all registered shutdown callbacks
- `ResponsePayload` -- type for response data passed to handlers
- `ResponseHandler` -- type for response handler functions

## Dependencies

**Internal:** None (standalone registry).

**External:** None.

## Dependents

[[src-index|index.ts]], modules that register response handlers.

## Key Logic

- Simple registry pattern: arrays of callbacks with register/get accessors.
- Moved out of index.ts specifically to break circular dependency chains.
