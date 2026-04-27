---
title: "src/providers/provider-container-registry.ts"
aliases: []
category: files
tags: [typescript]
parents: [src-providers]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "src/providers/provider-container-registry.ts"
content_hash: "ecd530c11167511d"
exports: [registerProviderContainerConfig, getProviderContainerConfig, ProviderContainerContribution, VolumeMount]
imports: []
imported_by: ["src/container-runner.ts"]
data_reads: []
data_writes: []
---

# src/providers/provider-container-registry.ts

Host-side provider container config registry. Providers register extra mounts, environment variables, and runtime overrides needed when spawning their containers.

## Exports

- `registerProviderContainerConfig(name, config)` -- registers container config for a provider
- `getProviderContainerConfig(name)` -- retrieves container config for a provider
- `ProviderContainerContribution` -- type for provider container overrides
- `VolumeMount` -- type for a Docker volume mount specification

## Dependencies

No dependencies (standalone registry).

## Dependents

[[src-container-runner|container-runner.ts]]

## Key Logic

- Allows providers to declare extra Docker volume mounts, env vars, and runtime flags.
- Container-runner queries this registry when building Docker run arguments.
- Decouples provider-specific container needs from the generic spawning logic.
