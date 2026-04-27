---
title: "src/modules/permissions/sender-approval.ts"
aliases: []
category: files
tags: [typescript, permissions, approval]
parents: [src-modules-permissions]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/modules/permissions/sender-approval.ts"
content_hash: "2a87b92bb3fa3f5f"
exports: [handleUnknownSenderApproval]
imports: ["src/modules/approvals/primitive.ts", "src/modules/permissions/db/pending-sender-approvals.ts", "src/modules/permissions/db/users.ts", "src/modules/permissions/db/agent-group-members.ts", "src/log.ts"]
imported_by: ["src/modules/permissions/index.ts"]
data_reads: []
data_writes: []
---

# src/modules/permissions/sender-approval.ts

Handles approval workflow for messages from unknown senders. Builds an approval card and routes it to an admin for approve/deny decision.

## Exports

- `handleUnknownSenderApproval(event)` -- initiates approval flow for an unknown sender

## Dependencies

**Internal:**
- [[src-modules-approvals-primitive|approvals/primitive.ts]] -- `requestApproval`, `pickApprover`
- `permissions/db/pending-sender-approvals` -- tracks pending approval state
- `permissions/db/users` -- user identity lookups
- `permissions/db/agent-group-members` -- group membership management
- [[src-log|log.ts]] -- structured logging

## Dependents

- [[src-modules-permissions-index|permissions/index.ts]] -- wired into sender scope gate

## Key Logic

- When a message arrives from an unknown sender, an approval card is sent to the admin.
- On approval, the sender is added as a user and granted group membership.
- On denial, the message is dropped and the sender remains unrecognized.
