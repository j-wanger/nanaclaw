---
title: "src/channels/ask-question.ts"
aliases: []
category: files
tags: [typescript, channels, interaction]
parents: [src-channels]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/channels/ask-question.ts"
content_hash: "fa879d318170e35c"
exports: [normalizeOptions, NormalizedOption]
imports: []
imported_by: ["src/delivery.ts", "src/types.ts"]
data_reads: []
data_writes: []
---

# src/channels/ask-question.ts

Normalizes interactive question option formats for pending questions. Ensures consistent option shape regardless of how the container specifies choices.

## Exports

- `normalizeOptions(options)` -- converts various option formats to a standard shape
- `NormalizedOption` -- type for a normalized option entry

## Dependencies

None.

## Dependents

- [[src-delivery|delivery.ts]] -- normalizes options before rendering question cards
- [[src-types|types.ts]] -- re-exports the `NormalizedOption` type

## Key Logic

- Handles string arrays, object arrays, and mixed formats as input.
- Produces a uniform `NormalizedOption` shape with label and value for rendering across different channel adapters.
