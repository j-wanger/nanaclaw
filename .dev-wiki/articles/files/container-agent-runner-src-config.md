---
title: "container/agent-runner/src/config.ts"
aliases: []
category: files
tags: [typescript]
parents: [container-agent-runner-src]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "container/agent-runner/src/config.ts"
content_hash: "98fc94ff453865f9"
exports: [loadConfig, ContainerConfig]
imports: []
imported_by: ["container/agent-runner/src/index.ts"]
data_reads: ["/workspace/agent/container.json"]
data_writes: []
---

# container/agent-runner/src/config.ts

Reads the container.json configuration file mounted read-only at /workspace/agent/container.json inside the container.

## Exports

- `loadConfig()` -- reads and parses container.json
- `ContainerConfig` -- type for the container configuration object

## Dependencies

No internal dependencies. Reads from the filesystem directly.

## Dependents

[[container-agent-runner-src-index|index.ts]]

## Key Logic

- Reads /workspace/agent/container.json (mounted RO from the host).
- Returns typed configuration used to select provider, configure MCP servers, etc.
