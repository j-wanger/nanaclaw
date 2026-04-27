---
title: "src/channels/cli.ts"
aliases: []
category: files
tags: [typescript, channels, cli]
parents: [src-channels]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/channels/cli.ts"
content_hash: "363b0ddefc247c96"
exports: []
imports: ["src/channels/channel-registry.ts", "src/channels/adapter.ts"]
imported_by: ["src/channels/index.ts"]
data_reads: []
data_writes: []
---

# src/channels/cli.ts

Built-in CLI channel adapter providing an always-on local terminal interface. Self-registers into the channel registry as a side effect of being imported.

## Exports

None (side-effect-only module).

## Dependencies

**Internal:**
- [[src-channels-channel-registry|channel-registry.ts]] -- `registerChannelAdapter`
- [[src-channels-adapter|adapter.ts]] -- `ChannelRegistration`, `ChannelAdapter`

## Dependents

- [[src-channels-index|channels/index.ts]] -- imports for side-effect registration

## Key Logic

- Always-on: does not require external credentials or network access.
- Self-registers via `registerChannelAdapter` at import time.
- Provides a local development and debugging interface for the messaging system.
