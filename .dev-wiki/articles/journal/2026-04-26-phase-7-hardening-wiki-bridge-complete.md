---
title: "Phase 7: Production Hardening + Wiki Bridge Complete"
aliases: []
category: journal
tags: [hardening, knowledge-wiki, retrieval, testing, mcp, wiki-bridge]
parents: [phase-07-hardening-wiki-bridge]
created: 2026-04-26
updated: 2026-04-26
source: debrief
---

# Phase 7: Production Hardening + Wiki Bridge Complete

## What Happened
- Planned and implemented Phase 7 in a single session: planning (approach + plan review) then all 5 tasks
- Closed the wiki-bridge gap from the original Phase 1b plan — agents now get domain maps at spawn and can search wikis mid-session
- Built wiki-bridge.ts (host-side, reads wikis.json + schema.md hierarchy roots + recursive article counts → wiki-context.md fragment)
- Built wiki_search MCP tool (container-side, search.py subprocess + keyword fallback)
- Built automated spawn pipeline smoke test (scripts/smoke-test.ts, runs on Node via tsx)
- Approach reviewer: 7/10 → revised (Docker scoping, schema.md over index.md). Plan reviewer: 8/10 accept. Implementation reviewer: 7/10 → revised (budget test, assertion strength)

## Decisions Made
- [[phase-7-hardening-wiki-bridge-approach|Phase 7: Production Hardening + Wiki Bridge]] — wiki-bridge from wikis.json+schema.md (not index.md), wiki_search host-mode only, search.py via WIKI_TOOLS_DIR env var

## Problems Solved
- Smoke test needs Node (better-sqlite3) but was initially written for Bun — switched to npx tsx
- Recursive article counting needed for nested wiki directory structure (articles/concepts/, articles/patterns/, etc.)
- search.py corrupt output graceful handling via try/catch with keyword fallback

## Artifacts Changed
- `src/modules/memory/wiki-bridge.ts` (new — domain map generation)
- `src/modules/memory/wiki-bridge.test.ts` (new — 9 tests)
- `src/modules/memory/index.ts` (added generateWikiContext export)
- `src/container-runner.ts` (wired generateWikiContext into both spawn paths)
- `container/agent-runner/src/mcp-tools/wiki-search.ts` (new — search MCP tool)
- `container/agent-runner/src/mcp-tools/wiki-search.test.ts` (new — 7 tests)
- `container/agent-runner/src/mcp-tools/index.ts` (added wiki-search import)
- `scripts/smoke-test.ts` (new — 4-step structural pipeline test)

### Review Gate
Implementation reviewer: 7/10. HIGH: state-sync issues (expected pre-debrief). MEDIUM: missing budget test (fixed), weak assertion (fixed), smoke test skips composeGroupClaudeMd step (noted — deep dependency on GROUPS_DIR makes structural testing hard).

### Activation Quality
Active knowledge: 3 entries, 2 referenced (~67% approximate hit rate, literal match). Healthy activation.

## Related
- [[phase-07-hardening-wiki-bridge|Phase 7: Production Hardening + Wiki Bridge]]
