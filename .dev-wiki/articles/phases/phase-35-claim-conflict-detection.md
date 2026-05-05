---
title: "Phase 35: Claim Conflict Detection"
aliases: []
category: phases
tags: [knowledge-architecture, claim-provenance, conflict-detection]
parents: []
created: 2026-05-04
updated: 2026-05-04
source: plan
status: active
scope: ["container/agent-runner/src/mcp-tools/claim-conflicts.ts", "container/agent-runner/src/mcp-tools/claim-linker.ts", "container/agent-runner/src/mcp-tools/index.ts"]
entry_criteria: "Phase 34 complete (claim_link operational, sentence_ids populated, NLI verification working)"
exit_criteria: "claim_conflicts MCP tool operational, shared-evidence detection finds overlapping sentence_ids across articles, staleness detection identifies claims where source was updated after verified_at, cross-claim NLI conflicts detected between high-similarity claims, all tests passing"
---

# Phase 35: Claim Conflict Detection

## Objective

Build claim-level conflict detection with three detection vectors (shared evidence, staleness, cross-claim NLI) exposed via a `claim_conflicts` MCP tool.

## Scope

- `container/agent-runner/src/mcp-tools/claim-conflicts.ts` (new — all three detectors + MCP tool)
- `container/agent-runner/src/mcp-tools/claim-linker.ts` (export claim metadata parser)
- `container/agent-runner/src/mcp-tools/index.ts` (barrel import)

## Exit Criteria

- [x] claim_conflicts MCP tool operational
- [x] Shared-evidence detection finds claims with overlapping sentence_ids across articles
- [x] Staleness detection identifies claims where source was updated after verified_at
- [x] Cross-claim NLI conflicts detected between high-similarity claims from different articles
- [x] All tests passing (556/556)

## Notes

Phase 4 of 6-phase Option B architecture. Three vectors: shared-evidence (deterministic set intersection, highest confidence), staleness (file mtime vs verified_at), cross-claim NLI (on-the-fly embedding + Qwen classification, supplementary signal due to TNR <25%). Claims parsed from article files on disk, not knowledge.db claim-type entries (empty article_slug). Orphan detection is a DISCOVERY addition (free byproduct of staleness).
