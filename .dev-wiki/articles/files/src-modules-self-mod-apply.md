---
title: "src/modules/self-mod/apply.ts"
aliases: []
category: files
tags: [typescript]
parents: [src-modules-self-mod]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/modules/self-mod/apply.ts"
content_hash: "6b9e802c7f118cf9"
exports: [applySelfMod]
imports: ["src/container-config.ts", "src/container-runtime.ts", "src/log.ts"]
imported_by: ["src/modules/self-mod/index.ts"]
data_reads: []
data_writes: []
---

# src/modules/self-mod/apply.ts

Applies approved self-modification requests. Handles both install_packages (container image rebuild) and add_mcp_server (container.json update + restart).

## Exports

- `applySelfMod(request)` -- executes an approved self-modification

## Dependencies

**Internal:**
- [[src-container-config|container-config.ts]] -- reads/writes container.json for MCP server additions
- [[src-container-runtime|container-runtime.ts]] -- rebuilds container image or restarts container
- [[src-log|log.ts]] -- structured logging

## Dependents

[[src-modules-self-mod-index|self-mod/index.ts]]

## Key Logic

- install_packages: triggers a container image rebuild with the new packages.
- add_mcp_server: updates container.json with the new MCP server config, then restarts the container.
- Only executes after admin approval has been granted on the host side.
