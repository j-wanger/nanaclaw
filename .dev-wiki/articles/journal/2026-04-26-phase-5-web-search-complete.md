---
title: "Phase 5: Web Search + Deep Research Complete"
aliases: []
category: journal
tags: [web-search, mcp, research, knowledge-wiki, phase-complete]
parents: [phase-05-web-search-research]
created: 2026-04-26
updated: 2026-04-26
source: debrief
---

# Phase 5: Web Search + Deep Research Complete

## What Happened
- Planned and implemented Phase 5 in a single session: planning, approach review, 5 tasks, implementation review
- Researched NousResearch/hermes-agent for web search patterns — adopted two-step search-then-extract workflow
- Evaluated Firecrawl (self-hosted search wraps SearXNG underneath, heavy infra) vs SearXNG (lightweight) vs Brave (cloud-only) — chose SearXNG
- Built 3 new MCP tools: web_search (SearXNG), web_extract (@mozilla/readability + linkedom), wiki_write (dynamic routing via wikis.json)
- Created deep-research container skill with orchestration workflow and Qwen worker dispatch patterns
- Pipeline integration test proves search → extract → worker contract → wiki output flow works end-to-end

## Decisions Made
- [[phase-5-web-search-approach|SearXNG + Readability + Dynamic Wiki Routing]] — extracted this session

## Problems Solved
- Firecrawl popularity concern — research showed self-hosted Firecrawl search delegates to SearXNG, so just use SearXNG directly
- Exit criterion 4 gap ("worker research with web search access") — plan reviewer flagged it, resolved by adding pipeline integration test

## Artifacts Changed
- `container/agent-runner/src/mcp-tools/web-search.ts` (new — SearXNG search tool, 7 tests)
- `container/agent-runner/src/mcp-tools/web-extract.ts` (new — readability content extraction, 6 tests)
- `container/agent-runner/src/mcp-tools/wiki-write.ts` (new — dynamic wiki routing, 7 tests)
- `container/agent-runner/src/mcp-tools/web-research-pipeline.test.ts` (new — 3 pipeline integration tests)
- `container/skills/deep-research/SKILL.md` (new — research workflow skill)
- `container/agent-runner/src/mcp-tools/index.ts` (barrel — 3 new imports)
- `container/agent-runner/package.json` (deps — @mozilla/readability, linkedom)

### Review Gate
Reviewer score: 8/10, verdict: accept. Fixed: dead mockFetch param, writeFileSync error handling gap, dead config.ts export.

### Activation Quality
Active knowledge: 3 entries, 3 referenced (~100% approximate hit rate, literal match).

## Related
- [[phase-05-web-search-research|Phase 5: Web Search + Deep Research]] — parent phase
