---
title: "container/agent-runner/src/destinations.ts"
aliases: []
category: files
tags: [typescript]
parents: [container-agent-runner-src]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "container/agent-runner/src/destinations.ts"
content_hash: "067bdfc42de1ae9d"
exports: [findByName, getAllDestinations, DestinationEntry]
imports: ["container/agent-runner/src/db/connection.ts"]
imported_by: ["container/agent-runner/src/poll-loop.ts", "container/agent-runner/src/mcp-tools/core.ts"]
data_reads: []
data_writes: []
---

# container/agent-runner/src/destinations.ts

Destination map that reads the destinations table from inbound.db and provides lookup by name. Used to resolve where outbound messages should be routed.

## Exports

- `findByName(name)` -- looks up a destination entry by name
- `getAllDestinations()` -- returns all known destinations
- `DestinationEntry` -- type for a destination record

## Dependencies

**Internal:**
- [[container-agent-runner-src-db-connection|connection.ts]] -- `getInDb` for read-only access to inbound.db

## Dependents

[[container-agent-runner-src-poll-loop|poll-loop.ts]], [[container-agent-runner-src-mcp-tools-core|mcp-tools/core.ts]]

## Key Logic

- Reads destinations from the inbound.db destinations table (read-only).
- Provides name-based lookup for MCP tools and poll loop routing.
