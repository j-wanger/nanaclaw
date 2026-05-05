---
title: "Phase 38: Review Remediation Complete"
aliases: []
category: journal
tags: [code-quality, documentation, memory-architecture]
parents: [phase-38-review-remediation]
created: 2026-05-05
updated: 2026-05-05
source: debrief
---

# Phase 38: Review Remediation Complete

## What Happened
- Addressed 4 of 5 issues from external code review in a single phase (issue 5 deferred)
- Committed and pushed Phases 33-37 (knowledge-wiki claim provenance pipeline) before starting remediation
- Created knowledge-routing.md mapping 30+ MCP tools to query intent
- Centralized loadWikis/resolveWikiPath/text() in wiki-utils.ts, replaced duplicates in 12 files (~240 lines removed)
- Updated wiki-manager taxonomy from "four tiers" to content-model terms (pipeline stages + lifecycle)
- Implemented context builder dual-read: MEMORY.md + memory.db memories table with graceful fallback
- Reviewer (6/10) caught missing CallToolResult type import after dedup — fixed inline

## Decisions Made
- [[phase-38-review-remediation-approach|Review Remediation: 4 Workstreams]] — medium confidence. Key deferral: claim_dedup O(n^2) stays because searchSimilar also does full-table scan (same complexity with worse constants)

## Problems Solved
- CallToolResult type import dropped during dedup — `text()` return type was co-imported with the private function. Fixed by re-exporting CallToolResult from wiki-utils.ts
- readMcpMemories db.close() not called on error path — fixed with try/finally pattern

## Artifacts Changed
- `container/agent-runner/src/mcp-tools/wiki-utils.ts` (added resolveWikiPath, text, re-export CallToolResult)
- `container/agent-runner/src/mcp-tools/wiki-utils.test.ts` (new, 5 tests)
- `container/skills/wiki-manager/knowledge-routing.md` (new)
- `container/skills/wiki-manager/SKILL.md` (taxonomy update)
- `container/skills/wiki-manager/instructions.md` (taxonomy + claim tools reference)
- `src/modules/memory/context-builder.ts` (dual-read + readMcpMemories)
- `src/modules/memory/context-builder.test.ts` (3 new tests)
- 12 MCP tool files (dedup: import from wiki-utils instead of private copies)

## Health Delta
- Container mcp-tools tests: 578 -> 583 (+5 wiki-utils tests)
- Host tests: 369 (unchanged)
- Type errors: 10 introduced by dedup, fixed by re-exporting CallToolResult
- Reviewer: 6/10 -> fixed (CallToolResult import + db.close)

### Review Gate
Reviewer score: 6/10 revise. 2 HIGH issues fixed inline (CallToolResult type import, stale state files). 1 LOW fixed (db.close try/finally). 1 MEDIUM noted (local-worker/tools.ts text() copy remains — out of scope, minor).

### Activation Quality
Active knowledge: 2 entries, 2 referenced (~100% approximate hit rate, literal match).

## Related
- [[phase-38-review-remediation|Phase 38: Review Remediation]]
