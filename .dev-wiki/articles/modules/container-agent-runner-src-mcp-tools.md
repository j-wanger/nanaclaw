---
title: "container/agent-runner/src/mcp-tools/"
aliases: []
category: modules
tags: [typescript]
parents: [container-agent-runner-src]
created: 2026-04-25
updated: 2026-04-25
source: scan
type: module
path: "container/agent-runner/src/mcp-tools/"
files: [container-agent-runner-src-mcp-tools-agents, container-agent-runner-src-mcp-tools-core, container-agent-runner-src-mcp-tools-index, container-agent-runner-src-mcp-tools-interactive, container-agent-runner-src-mcp-tools-self-mod, container-agent-runner-src-mcp-tools-scheduling, container-agent-runner-src-mcp-tools-server, container-agent-runner-src-mcp-tools-types]
external_deps: ["@modelcontextprotocol/sdk"]
internal_deps: []
dependents: [container-agent-runner-src]
content_hash: "95b6acab095de643"
---

# container/agent-runner/src/mcp-tools/

MCP tool server defining all tools available to the agent including send_message, schedule_task, ask_user_question, create_agent, and install_packages.

## Files

[[container-agent-runner-src-mcp-tools-core]], [[container-agent-runner-src-mcp-tools-scheduling]], [[container-agent-runner-src-mcp-tools-agents]], [[container-agent-runner-src-mcp-tools-interactive]], [[container-agent-runner-src-mcp-tools-self-mod]], [[container-agent-runner-src-mcp-tools-server]], [[container-agent-runner-src-mcp-tools-types]], [[container-agent-runner-src-mcp-tools-index]]

## Key Patterns

- Tool registration via `registerTools()` function
- Tools write to `outbound.db`; host processes system actions
- MCP server path exposed from `container/agent-runner/src/index.ts`

## Dependencies

**Internal:** `container/agent-runner/src/db/`, `container/agent-runner/src/destinations.ts`

**External:** `@modelcontextprotocol/sdk`

## Dependents

[[container-agent-runner-src]] (MCP server path)
