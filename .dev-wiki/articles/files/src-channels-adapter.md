---
title: "src/channels/adapter.ts"
aliases: []
category: files
tags: [typescript, channels, interface]
parents: [src-channels]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/channels/adapter.ts"
content_hash: "8bc3d77e60fba018"
exports: [ChannelAdapter, ChannelRegistration, ChannelSetup, InboundEvent, OutboundFile]
imports: []
imported_by: ["src/channels/channel-registry.ts", "src/router.ts", "src/delivery.ts", "src/session-manager.ts"]
data_reads: []
data_writes: []
---

# src/channels/adapter.ts

Core interface and type definitions for channel adapters. Defines the contract that all channel implementations must satisfy.

## Exports

- `ChannelAdapter` -- interface: methods a channel must implement (send, receive, teardown)
- `ChannelRegistration` -- type: adapter factory + metadata for registry
- `ChannelSetup` -- type: configuration passed during adapter initialization
- `InboundEvent` -- type: normalized inbound message from any channel
- `OutboundFile` -- type: file attachment in outbound messages

## Dependencies

None.

## Dependents

- [[src-channels-channel-registry|channel-registry.ts]] -- uses types for adapter management
- [[src-router|router.ts]] -- uses `InboundEvent` for routing
- [[src-delivery|delivery.ts]] -- uses `ChannelAdapter` for sending
- [[src-session-manager|session-manager.ts]] -- uses types for session-channel binding

## Key Logic

- Pure type/interface module with no runtime logic.
- `InboundEvent` normalizes messages from all platforms into a common shape.
- `ChannelAdapter` defines the send/teardown contract for outbound delivery.
