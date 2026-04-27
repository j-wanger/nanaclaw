---
title: "Phase 5: Web Search + Deep Research"
aliases: [phase-5, web-search, deep-research]
category: phases
tags: [web-search, research, mcp, knowledge-wiki]
parents: [phase-03c-dispatch-iteration]
created: 2026-04-25
updated: 2026-04-26
source: plan
status: active
scope: ["container/agent-runner/src/mcp-tools/web-search.ts", "container/agent-runner/src/mcp-tools/web-extract.ts", "container/agent-runner/src/mcp-tools/wiki-write.ts", "container/skills/deep-research/**", "container/agent-runner/src/config.ts"]
entry_criteria: "Phase 3 complete ✓, SearXNG or fallback search available"
exit_criteria: "Web search returns results, research produces structured output, output written to wiki inbox/ with frontmatter, worker research pipeline validated"
---

# Phase 5: Web Search + Deep Research

## Objective

Add web search and deep research capabilities via MCP tools, with dynamic knowledge-wiki routing for research output. Claude orchestrates search-extract-synthesize workflows, dispatching synthesis to local Qwen workers.

## Scope

Files and modules affected:
- `container/agent-runner/src/mcp-tools/web-search.ts` — SearXNG search tool
- `container/agent-runner/src/mcp-tools/web-extract.ts` — readability content extraction
- `container/agent-runner/src/mcp-tools/wiki-write.ts` — dynamic wiki routing
- `container/agent-runner/src/config.ts` — SEARXNG_URL env config
- `container/skills/deep-research/SKILL.md` — research workflow skill
- `container/agent-runner/src/mcp-tools/index.ts` — barrel wiring

## Exit Criteria

- [ ] Web search returns results for test query
- [ ] Research skill produces structured output
- [ ] Output written to knowledge-wiki inbox/ with frontmatter
- [ ] Worker research pipeline validated (search → extract → dispatch → wiki)

## Notes

- SearXNG follows whisper-server/llama-server HTTP service pattern
- Hermes Agent's search-then-extract two-step pattern adopted
- wiki_write routes to registered wikis by topic keyword matching
- Graceful degradation when SearXNG unavailable
