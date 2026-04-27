---
title: "src/index.ts"
aliases: []
category: files
tags: [typescript]
parents: [src]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/index.ts"
content_hash: "07adf0e813b9056c"
exports: [registerResponseHandler, onShutdown, ResponsePayload, ResponseHandler]
imports: ["src/config.ts", "src/claude-md-compose.ts", "src/db/connection.ts", "src/db/migrations/index.ts", "src/container-runtime.ts", "src/delivery.ts", "src/host-sweep.ts", "src/router.ts", "src/log.ts", "src/response-registry.ts", "src/channels/index.ts", "src/modules/index.ts", "src/channels/adapter.ts", "src/channels/channel-registry.ts"]
imported_by: []
data_reads: []
data_writes: []
---

# src/index.ts

Host entry point that initializes the database, runs migrations, starts channel adapters, starts delivery polls, starts the host sweep, and handles graceful shutdown. Re-exports response handler and shutdown hook registration from the response registry.

## Exports

- `registerResponseHandler(handler)` -- registers a response handler (re-export from response-registry)
- `onShutdown(callback)` -- registers a shutdown callback (re-export from response-registry)
- `ResponsePayload` -- type for response payloads (re-export)
- `ResponseHandler` -- type for response handler functions (re-export)

## Dependencies

**Internal:**
- [[src-config|config.ts]] -- `DATA_DIR`, env constants
- [[src-claude-md-compose|claude-md-compose.ts]] -- `migrateGroupsToClaudeLocal` for startup migration
- [[src-db-connection|connection.ts]] -- `initDb` for database initialization
- [[src-db-migrations-index|migrations/index.ts]] -- migration runner
- [[src-container-runtime|container-runtime.ts]] -- `ensureContainerRuntimeRunning`, `cleanupOrphans`
- [[src-delivery|delivery.ts]] -- `startActiveDeliveryPoll` for outbound delivery
- [[src-host-sweep|host-sweep.ts]] -- `startHostSweep` for periodic maintenance
- [[src-router|router.ts]] -- `routeInbound` for message routing setup
- [[src-log|log.ts]] -- structured logging
- [[src-response-registry|response-registry.ts]] -- handler/shutdown registries

## Dependents

Entry point -- not imported by other files.

## Key Logic

- Startup sequence: init DB, run migrations, ensure container runtime, cleanup orphans, start channel adapters, start delivery polls, start host sweep.
- Shutdown: iterates registered shutdown callbacks, stops polls and sweep, cleans up resources.
