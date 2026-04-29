---
title: "Phase 15: Iterative Research Pipeline"
aliases: [phase-15, iterative-research, research-fetch]
category: phases
tags: [research, mcp-tools, searxng, workers, knowledge-wiki, dispatch]
parents: [phase-14-unified-research-skill]
created: 2026-04-28
updated: 2026-04-28
completed: 2026-04-28
source: plan
status: completed
scope: ["container/agent-runner/src/mcp-tools/research-fetch.ts", "container/agent-runner/src/mcp-tools/research-fetch.test.ts", "container/agent-runner/src/mcp-tools/local-worker/contract.ts", "container/agent-runner/src/mcp-tools/local-worker/dispatch.ts", "container/agent-runner/src/mcp-tools/local-worker/dispatch.test.ts", "container/skills/research/**"]
entry_criteria: "Phase 14 partial (research skill exists, old skills deleted, model wired to Opus)"
exit_criteria: "research_fetch produces raw articles via script, .url-index dedup across wikis, iterative skill rewrite, write_to post-processing routes worker output, live test passes full pipeline, build clean"
---

# Phase 15: Iterative Research Pipeline

## Objective

Replace LLM-worker-driven search/extract with a scriptable MCP tool (research_fetch). Workers become single-shot cognitive tasks (summarize, review) with code-driven output routing via write_to contract extension. Nana orchestrates iteratively — wiki-first query, generate search queries, loop until coverage is sufficient.

## Scope

- `container/agent-runner/src/mcp-tools/research-fetch.ts` — new MCP tool
- `container/agent-runner/src/mcp-tools/local-worker/contract.ts` — write_to field
- `container/agent-runner/src/mcp-tools/local-worker/dispatch.ts` — post-processing logic
- `container/skills/research/` — skill rewrite + template updates

## Exit Criteria

- [ ] research_fetch MCP tool: SearXNG → dedup → fetch → write raw (script, no LLM)
- [ ] Per-wiki raw/.url-index with cross-wiki dedup
- [ ] write_to contract field + dispatch post-processing (episodic write, review status update)
- [ ] Research skill rewrite: wiki-first, iterative, single-shot workers
- [ ] Live test: full pipeline produces raw + episodic articles
- [ ] Build clean, all tests pass
