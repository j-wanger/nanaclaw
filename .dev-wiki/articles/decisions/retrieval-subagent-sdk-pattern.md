---
title: Retrieval Subagent via SDK Task Tool
confidence: high
source: spike
date: 2026-05-09
phase: 46
---

# Retrieval Subagent via SDK Task Tool

## Decision

Use the Claude Agent SDK's Task tool for ephemeral retrieval subagents. No agent-runner code changes needed.

## Evidence (Spike)

- `Task`, `TaskOutput`, `TaskStop` already allowlisted in `container/agent-runner/src/providers/claude.ts` (lines 48-50)
- `mcp__nanoclaw__*` wildcard in tool allowlist means Task subagents inherit all MCP tools (knowledge_search, wiki_read, wiki_search, knowledge_embed, etc.)
- Tool scoping is instruction-based: the retriever prompt tells the subagent which wiki to search. No code-level tool isolation needed.
- Task subagents are ephemeral: context is discarded on completion, preventing retrieval noise from polluting the parent agent's context

## Pattern

1. Nana classifies question as domain-specific (routing table in expert-routing skill)
2. Nana spawns a Task with: parameterized retriever prompt (wiki name + domain scope injected) + structured brief (question + constraints)
3. Task subagent runs: knowledge_search(wiki=X) with multiple query variations, wiki_read for full articles, extracts key facts
4. Task subagent returns structured JSON: relevant_articles, key_facts, coverage_assessment
5. Nana reads TaskOutput, formulates answer using curated context + conversation history

## Alternatives Considered

- **create_agent (persistent):** Too heavy for one-shot retrieval. Creates long-lived agents with workspace, memory, and messaging. Retrieval is stateless by nature.
- **consultExpert() TypeScript function:** Unnecessary. The Task tool already handles subagent lifecycle. Adding a custom function in the agent-runner would duplicate SDK functionality.
- **Direct search (no subagent):** Works for simple lookups but pollutes context with retrieval noise on complex queries. Subagent isolates the search journey.

## Cost

~2x per domain question (Sonnet subagent: ~2-3K input tokens + ~500 output). Acceptable for multi-hop queries where context quality matters. Simple lookups skip the subagent entirely.
