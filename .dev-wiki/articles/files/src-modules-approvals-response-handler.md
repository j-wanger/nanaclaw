---
title: "src/modules/approvals/response-handler.ts"
aliases: []
category: files
tags: [typescript, approvals, dispatch]
parents: [src-modules-approvals]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/modules/approvals/response-handler.ts"
content_hash: "9302997de08e06ea"
exports: [handleApprovalResponse]
imports: ["src/db/sessions.ts", "src/modules/approvals/primitive.ts", "src/log.ts"]
imported_by: ["src/modules/approvals/index.ts"]
data_reads: []
data_writes: []
---

# src/modules/approvals/response-handler.ts

Dispatches approval responses (approved/rejected) back to the registered handler for the approval type. Completes the approval lifecycle.

## Exports

- `handleApprovalResponse(approvalId, decision)` -- routes the response to the registered handler

## Dependencies

**Internal:**
- [[src-db-sessions|sessions.ts]] -- loads pending approval record
- [[src-modules-approvals-primitive|primitive.ts]] -- retrieves registered `ApprovalHandler`
- [[src-log|log.ts]] -- structured logging

## Dependents

- [[src-modules-approvals-index|approvals/index.ts]] -- wired into delivery response processing

## Key Logic

- Loads the pending approval from DB, looks up the registered handler by type, and dispatches the decision.
- Handles both approve and reject decisions.
- Cleans up the pending approval record after dispatch.
