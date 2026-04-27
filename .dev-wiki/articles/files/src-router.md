---
title: "src/router.ts"
aliases: []
category: files
tags: [typescript]
parents: [src]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/router.ts"
content_hash: "b880ed44c2c84bc2"
exports: [routeInbound, setSenderResolver, setAccessGate, setSenderScopeGate, setChannelRequestGate, SenderResolverFn, AccessGateResult, AccessGateFn, SenderScopeGateFn, ChannelRequestGateFn]
imports: ["src/channels/channel-registry.ts", "src/command-gate.ts", "src/db/agent-groups.ts", "src/db/dropped-messages.ts", "src/db/messaging-groups.ts", "src/db/sessions.ts", "src/modules/typing/index.ts", "src/log.ts", "src/session-manager.ts", "src/container-runner.ts", "src/types.ts", "src/channels/adapter.ts"]
imported_by: ["src/index.ts"]
data_reads: []
data_writes: []
---

# src/router.ts

Inbound message routing pipeline: receives a channel event, resolves the messaging group and sender, applies access and scope gates, resolves or creates a session, writes to `messages_in`, and wakes the container.

## Exports

- `routeInbound(event)` -- main routing entry point for channel events
- `setSenderResolver(fn)` -- injects sender resolution strategy
- `setAccessGate(fn)` -- injects access control gate
- `setSenderScopeGate(fn)` -- injects sender scope gate
- `setChannelRequestGate(fn)` -- injects channel request gate
- `SenderResolverFn` -- type for sender resolver functions
- `AccessGateResult` -- type for access gate return values
- `AccessGateFn` -- type for access gate functions
- `SenderScopeGateFn` -- type for sender scope gate functions
- `ChannelRequestGateFn` -- type for channel request gate functions

## Dependencies

**Internal:**
- [[src-command-gate|command-gate.ts]] -- `gateCommand` for admin command filtering
- [[src-db-sessions|sessions.ts]] -- session lookup/creation
- [[src-db-messaging-groups|messaging-groups.ts]] -- messaging group resolution
- [[src-session-manager|session-manager.ts]] -- `writeSessionMessage`, `resolveSession`
- [[src-container-runner|container-runner.ts]] -- `wakeContainer`
- [[src-log|log.ts]] -- structured logging

## Dependents

[[src-index|index.ts]]

## Key Logic

- Pipeline: channel event -> resolve messaging group -> sender resolver -> access gate -> resolve session -> write messages_in -> wake container.
- Gate functions are injected via setters, allowing modules to plug in access control.
