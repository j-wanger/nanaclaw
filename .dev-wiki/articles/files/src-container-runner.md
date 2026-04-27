---
title: "src/container-runner.ts"
aliases: []
category: files
tags: [typescript]
parents: [src]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/container-runner.ts"
content_hash: "66eb99952f420321"
exports: [wakeContainer, killContainer, isContainerRunning, getActiveContainerCount]
imports: ["src/config.ts", "src/container-config.ts", "src/container-runtime.ts", "src/claude-md-compose.ts", "src/db/agent-groups.ts", "src/db/connection.ts", "src/group-init.ts", "src/modules/typing/index.ts", "src/log.ts", "src/providers/index.ts", "src/providers/provider-container-registry.ts", "src/session-manager.ts", "src/types.ts"]
imported_by: ["src/router.ts", "src/host-sweep.ts", "src/modules/scheduling/actions.ts"]
data_reads: ["groups/<folder>/container.json", "OneCLI API"]
data_writes: ["Docker container spawn"]
---

# src/container-runner.ts

Container spawning logic that builds Docker arguments, mounts session and agent folders, integrates OneCLI for credential injection, and manages the active container lifecycle.

## Exports

- `wakeContainer(session)` -- starts or reuses a container for a session
- `killContainer(session)` -- terminates a running container
- `isContainerRunning(session)` -- checks container status
- `getActiveContainerCount()` -- returns number of active containers

## Dependencies

**Internal:**
- [[src-config|config.ts]] -- `CONTAINER_IMAGE`, `GROUPS_DIR`, `ONECLI_URL`
- [[src-container-config|container-config.ts]] -- `readContainerConfig` for per-group settings
- [[src-container-runtime|container-runtime.ts]] -- `CONTAINER_RUNTIME_BIN`, `hostGatewayArgs`
- [[src-claude-md-compose|claude-md-compose.ts]] -- `composeGroupClaudeMd`
- [[src-group-init|group-init.ts]] -- `initGroupFilesystem` for first-run scaffold
- [[src-session-manager|session-manager.ts]] -- session paths and status markers
- [[src-log|log.ts]] -- structured logging

**External:**
- OneCLI API for credential injection

## Dependents

[[src-router|router.ts]], [[src-host-sweep|host-sweep.ts]]

## Key Logic

- Builds Docker run args with volume mounts for session folder, agent group folder, and read-only system mounts.
- Integrates with OneCLI API for credential injection into container environment.
- Tracks active containers to enforce concurrency limits.
