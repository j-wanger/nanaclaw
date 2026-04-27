---
title: "src/channels/chat-sdk-bridge.ts"
aliases: []
category: files
tags: [typescript, channels, sdk]
parents: [src-channels]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/channels/chat-sdk-bridge.ts"
content_hash: "f1d0bae21402d131"
exports: [createChatSdkAdapter]
imports: ["chat", "src/channels/adapter.ts", "src/state-sqlite.ts", "src/log.ts"]
imported_by: []
data_reads: []
data_writes: []
---

# src/channels/chat-sdk-bridge.ts

Bridge module that wraps the external `chat` SDK into a `ChannelAdapter`. Used by SDK-based channel adapters (Telegram, Discord, Slack, etc.) to avoid duplicating adapter boilerplate.

## Exports

- `createChatSdkAdapter(config)` -- factory that returns a `ChannelAdapter` backed by the chat SDK

## Dependencies

**External:** `chat` -- generic chat SDK
**Internal:**
- [[src-channels-adapter|adapter.ts]] -- `ChannelAdapter` interface
- [[src-state-sqlite|state-sqlite.ts]] -- persistent state for SDK sessions
- [[src-log|log.ts]] -- structured logging

## Dependents

Imported by individual channel adapter modules (Telegram, Discord, Slack, etc.).

## Key Logic

- Adapts the generic `chat` SDK interface to the internal `ChannelAdapter` contract.
- Persists SDK-level state (tokens, cursors) via `state-sqlite` across restarts.
- Centralizes SDK error handling and reconnection logic.
