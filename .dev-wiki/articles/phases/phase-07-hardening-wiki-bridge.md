---
title: "Phase 7: Production Hardening + Wiki Bridge"
aliases: [phase-7, hardening, wiki-bridge]
category: phases
tags: [hardening, knowledge-wiki, retrieval, testing, mcp, integration]
parents: [phase-06-autonomous-loops]
created: 2026-04-26
updated: 2026-04-26
source: plan
status: completed
scope: ["src/modules/memory/**", "container/agent-runner/src/mcp-tools/wiki-search.ts", "scripts/smoke-test.ts", "src/container-runner.ts"]
entry_criteria: "Phase 6b complete (all fork phases done), knowledge-wiki repo available with search.py"
exit_criteria: "Wiki domain maps appear in .claude-fragments/ at spawn, wiki_search MCP tool returns results, automated smoke test passes, graceful degradation on missing wikis/index"
---

# Phase 7: Production Hardening + Wiki Bridge

## Objective

Close the wiki-bridge gap from the original Phase 1b plan (domain maps at spawn + mid-session wiki search) and add automated E2E smoke tests for the full spawn pipeline.

## Scope

Files and modules affected:
- `src/modules/memory/*` — wiki-bridge.ts (new), context-builder.ts (integration)
- `container/agent-runner/src/mcp-tools/wiki-search.ts` — new MCP tool
- `scripts/smoke-test.ts` — new automated smoke test
- `src/container-runner.ts` — WIKI_TOOLS_DIR env injection

## Exit Criteria

- [ ] Domain map from wikis.json appears in .claude-fragments/wiki-context.md at spawn
- [ ] wiki_search MCP tool returns ranked results when search index exists
- [ ] wiki_search falls back to keyword search when no index
- [ ] Automated smoke test passes without external services
- [ ] Graceful degradation: no wikis.json → no fragment; wiki missing → skip + warn

## Notes

- Depends on knowledge-wiki repo's search.py for full search capability
- Domain maps are frozen at spawn (consistent with memory-context.md pattern)
- search.py called as subprocess — Python3 required in host-mode
- Container-mode wiki search deferred (needs mount wiring)
