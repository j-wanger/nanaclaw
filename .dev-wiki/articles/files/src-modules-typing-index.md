---
title: "src/modules/typing/index.ts"
aliases: []
category: files
tags: [typescript]
parents: [src-modules-typing]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/modules/typing/index.ts"
content_hash: "c1ddac588f3a967b"
exports: [startTypingRefresh, stopTypingRefresh, pauseTypingRefreshAfterDelivery, setTypingAdapter]
imports: []
imported_by: ["src/router.ts", "src/delivery.ts", "src/container-runner.ts"]
data_reads: []
data_writes: []
---

# src/modules/typing/index.ts

Typing indicator refresh module. Sends periodic typing signals to the chat platform while the container is processing a request.

## Exports

- `startTypingRefresh(session)` -- begins sending typing indicators at intervals
- `stopTypingRefresh(session)` -- stops the typing indicator for a session
- `pauseTypingRefreshAfterDelivery(session)` -- temporarily pauses after a message delivery
- `setTypingAdapter(adapter)` -- sets the platform-specific typing adapter

## Dependencies

No internal imports. The platform adapter is injected via `setTypingAdapter`.

## Dependents

[[src-router|router.ts]], [[src-delivery|delivery.ts]], [[src-container-runner|container-runner.ts]]

## Key Logic

- Adapter pattern: platform-specific typing behavior is injected, not hardcoded.
- Interval-based refresh keeps the typing indicator visible during long operations.
- Pause-after-delivery prevents typing flicker when messages are being delivered.
