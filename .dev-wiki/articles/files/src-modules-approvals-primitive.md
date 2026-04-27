---
title: "src/modules/approvals/primitive.ts"
aliases: []
category: files
tags: [typescript, approvals, core]
parents: [src-modules-approvals]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/modules/approvals/primitive.ts"
content_hash: "3958310aef38c0d9"
exports: [pickApprover, pickApprovalDelivery, requestApproval, registerApprovalHandler, ApprovalHandler]
imports: ["src/db/sessions.ts", "src/db/connection.ts", "src/modules/permissions/db/user-roles.ts", "src/modules/permissions/db/user-dms.ts", "src/channels/channel-registry.ts", "src/delivery.ts", "src/log.ts", "src/types.ts"]
imported_by: ["src/modules/permissions/channel-approval.ts", "src/modules/permissions/sender-approval.ts", "src/modules/self-mod/"]
data_reads: []
data_writes: []
---

# src/modules/approvals/primitive.ts

Core approval primitives used by all approval workflows. Handles approver selection, delivery channel selection, and the approval request lifecycle.

## Exports

- `pickApprover(groupId)` -- selects approver by priority: owner > global admin > scoped admin
- `pickApprovalDelivery(userId)` -- finds a DM channel to deliver the approval card
- `requestApproval(card, handler)` -- persists approval request and delivers the card
- `registerApprovalHandler(type, handler)` -- registers a handler for an approval type
- `ApprovalHandler` -- type for approval response handler functions

## Dependencies

**Internal:**
- [[src-db-sessions|sessions.ts]] -- pending approval persistence
- [[src-db-connection|connection.ts]] -- `getDb`
- `permissions/db/user-roles` -- role lookups for approver selection
- `permissions/db/user-dms` -- DM channel lookups for delivery
- [[src-channels-channel-registry|channel-registry.ts]] -- adapter for card delivery
- [[src-delivery|delivery.ts]] -- message delivery
- [[src-log|log.ts]], [[src-types|types.ts]]

## Dependents

- [[src-modules-permissions-channel-approval|channel-approval.ts]], [[src-modules-permissions-sender-approval|sender-approval.ts]], `self-mod/`

## Key Logic

- Approver hierarchy: owner > global_admin > scoped_admin. Falls back through the chain.
- Approval cards are delivered via the approver's DM channel.
- Handlers are registered per approval type, enabling extensible approval workflows.
