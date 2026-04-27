---
title: "src/types.ts"
aliases: []
category: files
tags: [typescript]
parents: [src]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/types.ts"
content_hash: "36980185495b6b5d"
exports: [AgentGroup, MessagingGroup, Session, User, UserRole, MessagingGroupAgent, MessageIn, MessageOut, PendingQuestion, PendingApproval, AgentDestination]
imports: ["src/channels/ask-question.ts"]
imported_by: ["src/router.ts", "src/delivery.ts", "src/session-manager.ts", "src/container-runner.ts", "src/host-sweep.ts", "src/container-config.ts", "src/container-runtime.ts"]
data_reads: []
data_writes: []
---

# src/types.ts

Central type definitions for the host process domain model. Hub dependency imported by 7 files.

## Exports

- `AgentGroup` -- agent group configuration type
- `MessagingGroup` -- messaging group with channel bindings
- `Session` -- active session state
- `User` -- user identity type
- `UserRole` -- role enum/type for access control
- `MessagingGroupAgent` -- agent within a messaging group
- `MessageIn` -- inbound message structure
- `MessageOut` -- outbound message structure
- `PendingQuestion` -- pending question awaiting user response
- `PendingApproval` -- pending approval request
- `AgentDestination` -- routing destination for agent messages

## Dependencies

**Internal:**
- [[src-channels-ask-question|ask-question.ts]] -- type-only import for question types

## Dependents

[[src-router|router.ts]], [[src-delivery|delivery.ts]], [[src-session-manager|session-manager.ts]], [[src-container-runner|container-runner.ts]], [[src-host-sweep|host-sweep.ts]]
