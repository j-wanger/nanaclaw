---
title: "Phase 44: Curated Article Embedding + Index-in-Context Complete"
aliases: []
category: journal
tags: [knowledge-pipeline, retrieval, embedding, curated, wiki]
parents: [phase-44-curated-article-embedding]
created: 2026-05-07
updated: 2026-05-07
source: debrief
---

# Phase 44: Curated Article Embedding + Index-in-Context Complete

## What Happened
- Added "curated" type to knowledge vector store type system and search filter, enabling semantic search across curated wiki articles alongside raw source sentences
- Built citation marker stripping utility (`stripCitationMarkers`) that removes `[slug-with-hyphens]` patterns while preserving `[1]`, `[note]`, and regular text
- Added curated article embedding path to `knowledge_embed` with `source="articles"` — recursively reads `.md` files from `articles/` subdirectories, strips citations, embeds with `typeOverride="curated"`, and tracks state with `"articles:"` prefix
- Extended wiki-bridge with `buildArticleIndex` that generates a compact article index grouped by category at spawn, injected into agent context for native attention routing
- Updated documentation: knowledge-routing.md, wiki-manager instructions.md, MCP tool descriptions

## Problems Solved
- Background Agent subagent environment doesn't have bun in default PATH — used absolute path `/Users/jwang/.bun/bin/bun` as workaround for container typecheck

## Artifacts Changed
- `container/agent-runner/src/mcp-tools/knowledge-vector-store.ts` (added 'curated' type)
- `container/agent-runner/src/mcp-tools/knowledge-tools.ts` (source="articles" branch, listMdFilesRecursive, updated descriptions)
- `container/agent-runner/src/mcp-tools/sentence-embed-pipeline.ts` (typeOverride param, citation stripping, state key prefixing)
- `container/agent-runner/src/mcp-tools/sentence-embed-pipeline.test.ts` (5 new tests)
- `container/agent-runner/src/mcp-tools/knowledge-tools.test.ts` (7 new curated tests)
- `src/modules/memory/wiki-bridge.ts` (buildArticleIndex, article index in spawn context)
- `src/modules/memory/wiki-bridge.test.ts` (4 new tests)
- `container/skills/wiki-manager/knowledge-routing.md` (curated routing entries)
- `container/skills/wiki-manager/instructions.md` (curated embedding section)

## Health Delta
- Container tests: 449 pass, 0 fail (new tests for stripCitationMarkers, curated embedding path)
- Host tests: 377 pass (new wiki-bridge article index tests)
- Both typechecks clean
- No new lint violations

### Activation Quality
3 active-knowledge entries loaded for Phase 44. All 3 slugs referenced: curated-article-embedding-approach, knowledge-pipeline-post-phase-42-design, inline-citation-convention. Hit rate: 3/3 (100%).

## Soft Observations / Phase N+1 Candidates
- bun not in Background Agent subagent PATH — may affect other dispatched tasks needing container typecheck
- Index-in-context pattern (loading article index at spawn) could extend to other spawn-time context injection beyond wiki articles

## Related
- [[phase-44-curated-article-embedding|Phase 44: Curated Article Embedding + Index-in-Context]] -- parent phase
- [[phase-43-knowledge-pipeline-instruction-cleanup|Phase 43: Knowledge Pipeline Instruction Cleanup]] -- predecessor phase
