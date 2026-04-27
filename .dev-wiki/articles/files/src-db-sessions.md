---
title: "src/db/sessions.ts"
aliases: []
category: files
tags: [typescript, database, session]
parents: [src-db]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/db/sessions.ts"
content_hash: "14cc55e0baab1871"
exports: [createSession, getSession, findSession, findSessionByAgentGroup, findSessionForAgent, getSessionsByAgentGroup, getActiveSessions, getRunningSessions, updateSession, deleteSession, createPendingQuestion, getPendingQuestion, deletePendingQuestion, createPendingApproval, getPendingApproval, updatePendingApprovalStatus, deletePendingApproval, getPendingApprovalsByAction]
imports: ["src/db/connection.ts"]
imported_by: ["src/router.ts", "src/delivery.ts", "src/host-sweep.ts", "src/session-manager.ts", "src/modules/scheduling/"]
data_reads: []
data_writes: []
---

# src/db/sessions.ts

Session CRUD operations plus pending question and approval management against the central database.

## Exports

**Session CRUD:** `createSession`, `getSession`, `findSession`, `findSessionByAgentGroup`, `findSessionForAgent`, `getSessionsByAgentGroup`, `getActiveSessions`, `getRunningSessions`, `updateSession`, `deleteSession`

**Pending questions:** `createPendingQuestion`, `getPendingQuestion`, `deletePendingQuestion`

**Pending approvals:** `createPendingApproval`, `getPendingApproval`, `updatePendingApprovalStatus`, `deletePendingApproval`, `getPendingApprovalsByAction`

## Dependencies

**Internal:** [[src-db-connection|connection.ts]] -- `getDb`

## Dependents

- [[src-router|router.ts]], [[src-delivery|delivery.ts]], [[src-host-sweep|host-sweep.ts]], [[src-session-manager|session-manager.ts]], [[src-modules-scheduling-actions|scheduling/actions.ts]]

## Key Logic

- Session lookup supports multiple strategies: by ID, by agent group, by agent, and by messaging group + agent group combination.
- Pending questions/approvals are stored alongside sessions for interactive approval workflows.
