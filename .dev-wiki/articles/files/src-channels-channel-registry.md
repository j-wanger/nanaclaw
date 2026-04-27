---
title: "src/channels/channel-registry.ts"
aliases: []
category: files
tags: [typescript, channels, registry]
parents: [src-channels]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/channels/channel-registry.ts"
content_hash: "cbee7d1f0b732fa9"
exports: [registerChannelAdapter, getChannelAdapter, getActiveAdapters, getRegisteredChannelNames, getChannelContainerConfig, initChannelAdapters, teardownChannelAdapters]
imports: ["src/channels/adapter.ts", "src/log.ts"]
imported_by: ["src/index.ts", "src/router.ts"]
data_reads: []
data_writes: []
---

# src/channels/channel-registry.ts

Channel adapter registry: manages registration, initialization, lookup, and teardown of channel adapters. Adapters self-register by importing this module and calling `registerChannelAdapter`.

## Exports

- `registerChannelAdapter(reg)` -- register an adapter factory
- `getChannelAdapter(type)` -- get an initialized adapter by channel type
- `getActiveAdapters()` -- list all currently active adapters
- `getRegisteredChannelNames()` -- list all registered channel type names
- `getChannelContainerConfig(type)` -- get container config for a channel
- `initChannelAdapters(setup)` -- initialize all registered adapters with setup context
- `teardownChannelAdapters()` -- gracefully shut down all active adapters

## Dependencies

**Internal:**
- [[src-channels-adapter|adapter.ts]] -- `ChannelRegistration`, `ChannelSetup`
- [[src-log|log.ts]] -- structured logging

## Dependents

- [[src-index|index.ts]] -- calls `initChannelAdapters` at startup
- [[src-router|router.ts]] -- calls `getChannelAdapter` for routing

## Key Logic

- Retries initialization on `NetworkError` for resilience against transient failures.
- Adapters register factories (not instances) so initialization is deferred until startup.
- Teardown iterates all active adapters for graceful shutdown.
