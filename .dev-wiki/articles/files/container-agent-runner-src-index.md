---
title: "container/agent-runner/src/index.ts"
aliases: []
category: files
tags: [typescript]
parents: [container-agent-runner-src]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "container/agent-runner/src/index.ts"
content_hash: "8c1d002a525617e7"
exports: [main]
imports: ["container/agent-runner/src/config.ts", "container/agent-runner/src/destinations.ts", "container/agent-runner/src/providers/index.ts", "container/agent-runner/src/providers/factory.ts", "container/agent-runner/src/poll-loop.ts"]
imported_by: []
data_reads: []
data_writes: []
---

# container/agent-runner/src/index.ts

Container entry point that loads configuration, creates the AI provider instance, discovers extra mounts, configures MCP servers, and runs the main poll loop.

## Exports

- `main()` -- entry point function that orchestrates container startup

## Dependencies

**Internal:**
- [[container-agent-runner-src-config|config.ts]] -- `loadConfig` for reading container.json
- [[container-agent-runner-src-destinations|destinations.ts]] -- destination lookup from inbound.db
- [[container-agent-runner-src-providers-index|providers/index.ts]] -- provider side-effect registration
- [[container-agent-runner-src-providers-factory|providers/factory.ts]] -- `createProvider` for provider instantiation
- [[container-agent-runner-src-poll-loop|poll-loop.ts]] -- `runPollLoop` for the main message processing loop

## Dependents

Entry point -- not imported by other files.

## Key Logic

- Loads container.json config, creates the specified AI provider, then enters the poll loop.
- Discovers extra mounts and configures MCP servers before starting the loop.
