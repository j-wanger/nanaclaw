---
title: "container/agent-runner/src/db/session-routing.ts"
aliases: []
category: files
tags: [typescript]
parents: [container-agent-runner-src-db]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "container/agent-runner/src/db/session-routing.ts"
content_hash: "da5477403c9cc77f"
exports: [getSessionRouting]
imports: ["container/agent-runner/src/db/connection.ts"]
imported_by: ["container/agent-runner/src/mcp-tools/core.ts"]
data_reads: []
data_writes: []
---

# container/agent-runner/src/db/session-routing.ts

Reads default reply routing from the session_routing table in inbound.db. Provides the default destination for replies when no explicit routing is specified.

## Exports

- `getSessionRouting()` -- returns the default routing configuration for the session

## Dependencies

**Internal:**
- [[container-agent-runner-src-db-connection|connection.ts]] -- `getInDb` for read-only access

## Dependents

[[container-agent-runner-src-mcp-tools-core|mcp-tools/core.ts]]

## Key Logic

- Reads from the session_routing table populated by the host before container start.
- Provides fallback routing when MCP tools send messages without explicit destination.
