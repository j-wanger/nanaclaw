---
title: "Phase 42: Pipeline Simplification Complete"
aliases: []
category: journal
tags: [pipeline, simplification, deletion, cleanup]
parents: [phase-42-pipeline-simplification]
created: 2026-05-05
updated: 2026-05-05
source: debrief
---

# Phase 42: Pipeline Simplification Complete

## What Happened
- Removed old Qwen-dependent summarization pipeline and all claim provenance tools
- Deleted 20+ source files + stale test files from container/agent-runner
- Kept deterministic pipeline: research_fetch → knowledge_embed → knowledge_search + knowledge_conflicts
- Cleared stale wiki data across 7 wikis (episodic/, articles/, inbox/, claims.jsonl, etc.)
- Updated all skill documentation and .claude-fragments to reflect simplified pipeline

## Decisions Made
- [[phase-42-pipeline-simplification-approach|Pipeline Simplification]] — high confidence. Confirmed: no Qwen in critical path, sentence embeddings fully supersede claim provenance chain

## Problems Solved
- dispatch.test.ts stale tests: 4 tests referenced removed `claims` and `entities` WriteTo.tier branches — DISCOVERY escape hatch, removed the tests
- zsh glob error: `claim-discovery-*.json` pattern failed with "no matches found" — fixed with `ls | while read` pattern
- bun/pnpm not in PATH: shell didn't have tool paths — used full paths

## Escape Hatches
- DISCOVERY: Stale tests in dispatch.test.ts for removed WriteTo.tier branches — discovered during Task 6 verification

## Artifacts Changed
- 20+ source files DELETED (research-summarize.ts, claim-tools.ts, claim-linker.ts, claim-reconcile.ts, claim-store.ts, entity-store.ts, source-score.ts, claim-embed-pipeline.ts, article-validation.ts, research-review.ts, url-index.ts, wiki-backfill.ts, knowledge-discovery.ts, and matching test files)
- container/agent-runner/src/mcp-tools/index.ts (6 barrel imports removed)
- container/agent-runner/src/mcp-tools/knowledge-analysis-tools.ts (claim_discover removed)
- container/agent-runner/src/mcp-tools/knowledge-classify.ts (claim validation removed, conflict classification kept)
- container/agent-runner/src/mcp-tools/local-worker/dispatch.ts (extraction branches stripped)
- container/agent-runner/src/mcp-tools/local-worker/contract.ts (WriteTo.tier narrowed to episodic|review)
- container/agent-runner/src/mcp-tools/local-worker/dispatch.test.ts (4 stale tests removed)
- container/agent-runner/src/mcp-tools/sentence-embed-pipeline.ts (ClaimEntry inlined)
- container/skills/research/SKILL.md + instructions.md (full rewrite)
- container/skills/research/summarize-prompt.md + review-prompt.md (DELETED)
- container/skills/wiki-manager/knowledge-routing.md (11→5 rows)
- groups/dm-with-wang/.claude-fragments/skill-research.md + skill-wiki-manager.md (updated)
- 7 wiki directories cleaned under /Users/jwang/private-knowledge/

## Health Delta
- Container tests: 449 → 446 (-3 stale tests removed for deleted functionality)
- Host tests: 374 (unchanged)
- Type errors: 0 (clean)

### Activation Quality
Active knowledge: 2 entries, 1 referenced (~50% approximate hit rate, literal match).
claim_dedup entry was referenced (being deleted). Migration schema entry was not relevant to Phase 42.
Consider pruning low-relevance entries in next /dev-plan.

## Related
- [[phase-42-pipeline-simplification|Phase 42: Pipeline Simplification]]
- Completes the migration from Qwen-dependent pipeline to deterministic sentence embedding pipeline
- Claim provenance chain (Phases 21-23, 33-37) removed — functionality can be rebuilt on sentence embeddings if needed
