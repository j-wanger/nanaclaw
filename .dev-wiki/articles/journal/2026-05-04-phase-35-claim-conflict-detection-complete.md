---
title: "Phase 35: Claim Conflict Detection Complete"
aliases: []
category: journal
tags: [knowledge-architecture, claim-provenance, conflict-detection]
parents: [phase-35-claim-conflict-detection]
created: 2026-05-04
updated: 2026-05-04
source: debrief
---

# Phase 35: Claim Conflict Detection Complete

## What Happened
- Planned and implemented Phase 35 (Phase 4 of Option B architecture) in a single session
- Approach reviewer (7/10 revise) caught two critical design issues: (1) knowledge.db `created` dates are embed-time, not content-time — staleness must use file mtime, (2) claim-type entries in knowledge.db have empty `article_slug` — cross-claim NLI must parse from article files instead
- Built three detection vectors: shared-evidence (deterministic set intersection), staleness (file mtime + orphaned IDs), cross-claim NLI (on-the-fly embedding + Qwen classification)
- All three vectors use dependency injection for testability (StalenessCheckDeps, ClaimNliDeps)

## Decisions Made
- [[phase-35-claim-conflict-detection-approach|Phase 35: Claim Conflict Detection Approach]] — three vectors, separate tool from knowledge_conflicts, file mtime over knowledge.db timestamps

## Problems Solved
- Staleness detection redesigned: knowledge.db `created` is embed-time, sentence IDs aren't stable across re-embeds — switched to comparing source article file mtime against claim `verified_at`
- Cross-claim NLI: knowledge.db claim entries have empty `article_slug`, making cross-article filtering impossible — parse claims from article files on disk instead

## Artifacts Changed
- `container/agent-runner/src/mcp-tools/claim-conflicts.ts` (new — 341 lines, all three detectors + MCP tool)
- `container/agent-runner/src/mcp-tools/claim-conflicts.test.ts` (new — 405 lines, 17 tests)
- `container/agent-runner/src/mcp-tools/claim-linker.ts` (added parseClaimMetadata + ClaimMeta export, 5 new tests)
- `container/agent-runner/src/mcp-tools/index.ts` (barrel import)

### Review Gate
Reviewer: 8/10 accept. Issues: empty catch blocks (fixed — added stderr logging), loadWikis/resolveWikiPath duplication (matches existing convention across 11 files). Self-check: clean (7 categories).

### Health Delta
Tests: 534 → 556 (+22). Typecheck: clean. No regressions.

### Activation Quality
Active knowledge: 4 entries, 4 referenced (~100% hit rate, literal match).

## Related
- [[phase-35-claim-conflict-detection|Phase 35: Claim Conflict Detection]] — parent phase
