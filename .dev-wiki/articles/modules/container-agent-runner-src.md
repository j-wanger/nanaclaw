---
title: "container/agent-runner/src/"
aliases: []
category: modules
tags: [typescript]
parents: []
created: 2026-04-25
updated: 2026-04-25
source: scan
type: module
path: "container/agent-runner/src/"
files: [container-agent-runner-src-config, container-agent-runner-src-destinations, container-agent-runner-src-formatter, container-agent-runner-src-index, container-agent-runner-src-poll-loop, container-agent-runner-src-timezone]
external_deps: []
internal_deps: [container-agent-runner-src-mcp-tools]
dependents: []
content_hash: "cfdfc5e66edd2005"
---

# container/agent-runner/src/

Container-side agent runner providing the poll loop, message formatting, destination resolution, and provider abstraction for agent execution.

## Files

[[container-agent-runner-src-index]], [[container-agent-runner-src-poll-loop]], [[container-agent-runner-src-formatter]], [[container-agent-runner-src-destinations]], [[container-agent-runner-src-config]], [[container-agent-runner-src-timezone]]

## Key Patterns

- Poll-based message processing: `poll-loop.ts` drives the main execution cycle
- Provider abstraction: pluggable providers (claude, mock, extensible)
- Container entry point: nothing imports this module externally

## Dependencies

**Internal:** [[container-agent-runner-src-mcp-tools]], `container/agent-runner/src/db/`, `container/agent-runner/src/providers/`

**External:** None at module level

## Dependents

None (container entry point).
