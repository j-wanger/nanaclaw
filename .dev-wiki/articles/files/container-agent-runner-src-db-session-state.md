---
title: "container/agent-runner/src/db/session-state.ts"
aliases: []
category: files
tags: [typescript]
parents: [container-agent-runner-src-db]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "container/agent-runner/src/db/session-state.ts"
content_hash: "caa46526b76b560c"
exports: [setContinuation, clearContinuation, migrateLegacyContinuation, getSessionState, setSessionState]
imports: ["container/agent-runner/src/db/connection.ts"]
imported_by: ["container/agent-runner/src/poll-loop.ts"]
data_reads: []
data_writes: []
---

# container/agent-runner/src/db/session-state.ts

Key-value state persistence in outbound.db. Primarily used to store the SDK session ID for conversation continuation across poll iterations.

## Exports

- `setContinuation(sessionId)` -- stores a continuation session ID
- `clearContinuation()` -- removes the stored continuation
- `migrateLegacyContinuation()` -- migrates old-format continuation data
- `getSessionState(key)` -- generic key-value getter
- `setSessionState(key, value)` -- generic key-value setter

## Dependencies

**Internal:**
- [[container-agent-runner-src-db-connection|connection.ts]] -- `getOutDb` for write access

## Dependents

[[container-agent-runner-src-poll-loop|poll-loop.ts]]

## Key Logic

- Continuation persistence enables multi-turn conversations across poll loop iterations.
- Generic key-value interface allows extending state storage without schema changes.
- Legacy migration handles format changes from earlier versions.
