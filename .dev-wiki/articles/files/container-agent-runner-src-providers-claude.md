---
title: "container/agent-runner/src/providers/claude.ts"
aliases: []
category: files
tags: [typescript]
parents: [container-agent-runner-src-providers]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: file
path: "container/agent-runner/src/providers/claude.ts"
content_hash: "2d965ae8ab7d0669"
exports: []
imports: ["container/agent-runner/src/db/connection.ts", "container/agent-runner/src/providers/provider-registry.ts", "container/agent-runner/src/providers/types.ts"]
imported_by: ["container/agent-runner/src/providers/index.ts"]
data_reads: []
data_writes: []
---

# container/agent-runner/src/providers/claude.ts

Claude provider implementation using the Anthropic Claude Agent SDK. Self-registers via `registerProvider` on import (side-effect module).

## Exports

No named exports. Self-registers via side-effect import.

## Dependencies

**Internal:**
- [[container-agent-runner-src-db-connection|connection.ts]] -- tool-in-flight tracking
- [[container-agent-runner-src-providers-provider-registry|provider-registry.ts]] -- `registerProvider` for self-registration
- [[container-agent-runner-src-providers-types|types.ts]] -- `AgentProvider`, `AgentQuery` interfaces

**External:**
- `@anthropic-ai/claude-agent-sdk` -- Claude Agent SDK for running queries

## Dependents

[[container-agent-runner-src-providers-index|providers/index.ts]] (side-effect import)

## Key Logic

- Manages tool allowlist and SDK disallowed tools configuration.
- Uses MessageStream for push-based input to the agent query.
- Registers hook callbacks for tool tracking (in-flight state via connection.ts).
- Self-registers with the provider registry on module load.
