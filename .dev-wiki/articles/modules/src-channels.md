---
title: "src/channels/"
aliases: []
category: modules
tags: [typescript]
parents: [src]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: module
path: "src/channels/"
files: [src-channels-adapter, src-channels-ask-question, src-channels-channel-registry, src-channels-chat-sdk-bridge, src-channels-cli, src-channels-index]
external_deps: [chat]
internal_deps: []
dependents: [src, src-modules-permissions, src-modules-approvals]
content_hash: "ca7011867a1cd88c"
---

# src/channels/

Channel adapter infrastructure providing the registry, factory, built-in CLI adapter, and Chat SDK bridge for multi-platform messaging.

## Files

[[src-channels-adapter]], [[src-channels-channel-registry]], [[src-channels-cli]], [[src-channels-chat-sdk-bridge]], [[src-channels-ask-question]], [[src-channels-index]]

## Key Patterns

- Self-registration on import; channel branch adapters append imports to `index.ts`
- `adapter.ts` defines the channel interface contract
- `channel-registry.ts` handles register/init/teardown lifecycle

## Dependencies

**Internal:** Depends only on `src/log.ts`

**External:** `chat` (Chat SDK)

## Dependents

[[src]] (index, router, delivery, container-runner), [[src-modules-permissions]], [[src-modules-approvals]]
