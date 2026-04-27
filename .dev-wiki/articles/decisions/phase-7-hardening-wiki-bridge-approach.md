---
title: "Phase 7: Production Hardening + Wiki Bridge Approach"
aliases: [phase-7-approach, wiki-bridge-approach, hardening-approach]
category: decisions
tags: [hardening, knowledge-wiki, retrieval, testing, mcp]
parents: [phase-07-hardening-wiki-bridge]
created: 2026-04-26
updated: 2026-04-26
source: plan
confidence: medium
---

## Context

All 11 sub-phases (0 through 6b) of the original plan are complete. The system has memory, host-mode execution, local worker dispatch with tool-calling, voice I/O, web search, and autonomous research loops. Two gaps remain from the original Phase 1b plan: (1) wiki-bridge — domain maps at spawn + reactive wiki-search mid-session, and (2) no automated E2E smoke tests. Phase 2 also has a pending manual smoke test that was never automated.

The wiki-bridge is the integration point between NanaClaw (agent runtime) and knowledge-wiki (domain knowledge). Without it, agents spawn with no awareness of available wikis and can't search domain knowledge mid-session. The `wiki_write` MCP tool already routes writes to wikis; `wiki_search` is the read counterpart.

Wiki retrieval architecture (from [[wiki:wiki-retrieval-architecture]]): <200 articles → index-first pattern; 200-500 → hybrid BM25+vector. The user's wikis range from 50 to 279 articles. The knowledge-wiki repo's `search.py` provides BM25 and hybrid search against `.wiki-index.db`.

## Decision

**Two tracks in one phase: wiki bridge + production hardening.**

### Track A: Wiki Bridge

1. **Domain map at spawn** (`wiki-bridge.ts` in memory module). Reads `wikis.json` description field + each wiki's `schema.md` hierarchy roots + article count via `find`. No `index.md` parsing (avoids coupling to knowledge-wiki's index format). Writes `.claude-fragments/wiki-context.md` as a separate fragment from memory-context.md (different budget: ~500 tokens per wiki vs 1500 tokens memory). Called from `generateMemoryFragment` callsite in container-runner.ts.

2. **`wiki_search` MCP tool** (container agent-runner, **host-mode only**). Two-tier fallback:
   - If `.wiki-index.db` exists: shell out to knowledge-wiki's `search.py query --wiki-path <path> --query <text> --top <k> --bm25-only`
   - If no index: keyword-score against article frontmatter titles/tags in the wiki's `articles/` directory (simple TypeScript grep)
   - `WIKI_TOOLS_DIR` env var points to knowledge-wiki's `wiki-index/` skill directory. Injected from host env at spawn. When unset, skip search.py tier and fall back to keyword.
   - Reads `wikis.json` for path resolution (same pattern as existing `wiki_write`).
   - **Docker-mode deferred**: wiki filesystem paths + Python deps not available inside containers. Container-mode wiki search requires mount wiring (future phase).

### Track B: Production Hardening

1. **Automated smoke test** (`scripts/smoke-test.ts`). Structural E2E exercising the full spawn pipeline: session DB creation → memory fragment → wiki-context fragment → CLAUDE.md composition → host-mode env vars. Runnable without external services (no Docker, no API key, no llama-cpp).

2. **Graceful degradation verification**. Extend existing tests to cover: no wikis.json, wiki path missing, search.py unavailable, empty MEMORY.md. Most degradation paths already tested for voice/worker — focus on the new wiki-bridge code.

**Rejected alternatives:**
- *Native TypeScript search reimplementation* — reinvents what knowledge-wiki provides. The user confirmed integration with knowledge-wiki's search.py is the goal.
- *Separate phases for bridge vs hardening* — wiki-bridge is small (2-3 tasks) and the smoke test naturally exercises it. One phase is cleaner.
- *Embedding wiki domain map into memory-context.md* — separate fragment respects the original plan's budget split (1500 tokens memory + 500/wiki) and keeps concerns cleanly separated.

## Consequences

- New Python subprocess dependency in host-mode agent-runner (search.py). Container mode would need wiki paths + search tools mounted — deferred.
- `WIKI_TOOLS_DIR` env var must be set for full search capability; without it, keyword fallback still works.
- Domain maps are frozen at spawn (same pattern as memory). Wiki changes mid-session aren't reflected until next spawn.
- No search index built yet for any wiki — the keyword fallback is the initial experience. Users can run `python3 indexer.py build --wiki-path <path>` to enable BM25.
