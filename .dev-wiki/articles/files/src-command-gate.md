---
title: "src/command-gate.ts"
aliases: []
category: files
tags: [typescript]
parents: [src]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/command-gate.ts"
content_hash: "296a8563c595d7ac"
exports: [gateCommand]
imports: ["src/db/user-roles.ts"]
imported_by: ["src/router.ts"]
data_reads: []
data_writes: []
---

# src/command-gate.ts

Admin command classification that filters slash commands before they reach the container, denying unauthorized admin commands.

## Exports

- `gateCommand(message, sender)` -- classifies a message as allowed, denied, or pass-through based on sender role and command type

## Dependencies

**Internal:**
- `src/db/user-roles.ts` (via modules/permissions) -- user role lookups for authorization

## Dependents

[[src-router|router.ts]]

## Key Logic

- Parses incoming messages for slash command patterns.
- Checks sender's role against command authorization requirements.
- Returns allow/deny/pass-through decision before message reaches the container.
