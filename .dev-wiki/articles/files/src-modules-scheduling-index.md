---
title: "src/modules/scheduling/index.ts"
aliases: []
category: files
tags: [typescript, scheduling, module-init]
parents: [src-modules-scheduling]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/modules/scheduling/index.ts"
content_hash: "fc542941c2742296"
exports: []
imports: ["src/modules/scheduling/actions.ts", "src/response-registry.ts"]
imported_by: ["src/modules/index.ts"]
data_reads: []
data_writes: []
---

# src/modules/scheduling/index.ts

Module entry point that registers scheduling delivery action handlers into the response registry. Side-effect module.

## Exports

None (side-effect registration only).

## Dependencies

**Internal:**
- [[src-modules-scheduling-actions|actions.ts]] -- scheduling action handlers
- [[src-response-registry|response-registry.ts]] -- handler registration

## Dependents

- [[src-modules-index|modules/index.ts]] -- imports for side-effect registration

## Key Logic

- Registers handlers for schedule, cancel, pause, resume, and update task actions.
- Uses the response registry pattern consistent with other modules.
