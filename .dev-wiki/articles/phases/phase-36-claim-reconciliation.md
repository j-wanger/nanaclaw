---
title: "Phase 36: Claim Reconciliation"
aliases: []
category: phases
tags: [knowledge-architecture, claim-provenance, reconciliation]
parents: []
created: 2026-05-04
updated: 2026-05-04
source: plan
status: completed
scope: ["container/agent-runner/src/mcp-tools/claim-reconcile.ts", "container/agent-runner/src/mcp-tools/claim-reconcile.test.ts", "container/agent-runner/src/mcp-tools/index.ts"]
entry_criteria: "Phase 35 complete — claim_conflicts detects stale/orphaned claims, claim_link handles initial linking"
exit_criteria: "claim_reconcile tool operational, staleness+orphan repair working, dry-run mode, all tests passing"
---

# Phase 36: Claim Reconciliation

## Objective

Build an automated stale/orphan claim repair pipeline via `claim_reconcile` MCP tool that closes the lifecycle gap (stale → unlinked → linked → verified). Phase 5 of the 6-phase Option B architecture.

## Scope

Files and modules affected:
- `container/agent-runner/src/mcp-tools/claim-reconcile.ts` (new)
- `container/agent-runner/src/mcp-tools/claim-reconcile.test.ts` (new)
- `container/agent-runner/src/mcp-tools/index.ts` (barrel import)

## Exit Criteria

- [x] `claim_reconcile` tool exists with wiki + optional article_slug + dry_run params
- [x] Staleness + orphan detection reuses existing detectStaleClaims from claim-conflicts.ts
- [x] Re-linking reuses existing linkArticleClaims pipeline from claim-linker.ts
- [x] Dry run mode returns report without writing to disk
- [x] All tests passing (566 total, 10 new reconcile tests)

## Notes

- Reuses existing infrastructure: detectStaleClaims (claim-conflicts.ts), linkArticleClaims (claim-linker.ts), KnowledgeVectorStore, embedText, executeAgentLoop
- Atomic operation: clear stale claims in-memory + re-link + single disk write
- Dry-run skips NLI for speed (passes skip_nli to linkArticleClaims)
- Reconciliation limited to staleness/orphan repair; shared-evidence and NLI conflicts remain detection-only (claim_conflicts surfaces them for human judgment)
