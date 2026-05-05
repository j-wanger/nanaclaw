---
title: "Phase 36: Claim Reconciliation Approach"
aliases: []
category: decisions
tags: [knowledge-architecture, claim-provenance, reconciliation]
parents: [phase-36-claim-reconciliation]
created: 2026-05-04
updated: 2026-05-04
source: plan
confidence: medium
---

## Context

Phase 5 of the 6-phase Option B architecture ("Wiki as Primary, Sentences as Index"). Phases 33-35 established claim markers, linking, and conflict detection. The lifecycle has a gap: `claim_conflicts` can DETECT stale/orphaned claims but nothing can FIX them. The reconciliation tool closes the `stale → unlinked → linked → verified` loop.

## Decision

**New `claim_reconcile` MCP tool in `claim-reconcile.ts`:**

1. Detect stale claims (source_docs mtime > verified_at) and orphaned claims (sentence_ids missing from knowledge.db) — reuses `detectStaleClaims` + `buildStaleDeps` pattern from claim-conflicts.ts
2. Clear affected claims to unlinked state in-memory (reset sentence_ids=[], source_docs=[], nli_score=null, verified_at=null)
3. Re-run `linkArticleClaims` on the modified content — processes all claims in the article (idempotent; non-stale claims get refreshed data)
4. Single atomic disk write of final result
5. Dry-run mode: runs detection + in-memory clear, skips NLI (skip_nli=true), reports before/after without writing

**Separate tool from `claim_link`** — different semantics: detect-then-fix (reconcile) vs initial population (link). Different user intent.

**Article-level re-linking** — if an article has stale claims, re-link the entire article. linkArticleClaims processes all claim markers, generating updates for any it can match. Compute cost trivial at wiki scale (<100 articles, <10 claims each).

**Fail-closed on error** — if re-linking fails (embedding server down, NLI timeout), leave claims in stale state rather than clearing to unlinked without re-linking. Achieved by single atomic write: only write if linkArticleClaims returns successfully.

**Alternatives rejected:**
- Per-claim selective re-linking (modify linkArticleClaims with filter): adds complexity without meaningful benefit since re-linking is idempotent
- Extending claim_link with "reconcile mode": conflates initial linking with repair semantics
- Auto-resolving shared-evidence/NLI conflicts: requires human judgment, already surfaced by claim_conflicts

## Consequences

- Claim lifecycle gap is closed: stale → re-verified is now automated
- Orphaned claims (dead sentence_ids after re-embed) are repaired automatically
- Non-stale claims in affected articles get refreshed linkage as a side effect (idempotent, not harmful)
- Dry-run mode enables safe preview before committing changes
- Approach reviewer score: 8/10 accept — noted atomicity concern (addressed by single-write design)
