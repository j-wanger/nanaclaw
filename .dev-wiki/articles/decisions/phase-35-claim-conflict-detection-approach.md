---
title: "Phase 35: Claim Conflict Detection Approach"
aliases: []
category: decisions
tags: [knowledge-architecture, claim-provenance, conflict-detection]
parents: [phase-35-claim-conflict-detection]
created: 2026-05-04
updated: 2026-05-04
source: plan
confidence: medium
---

## Context

Phase 4 of the 6-phase Option B architecture ("Wiki as Primary, Sentences as Index"). Claims are now linked to supporting evidence via sentence_ids (Phase 34). The existing `knowledge_conflicts` tool detects sentence-level contradictions but has no awareness of claim metadata (linkage, verification state, staleness). Phase 35 adds claim-level conflict detection using three vectors that leverage the linkage metadata.

## Decision

**Three detection vectors, unified MCP tool:**

1. **Shared-evidence detection** — deterministic set intersection on sentence_ids across articles. Claims in different articles citing overlapping evidence are a high-confidence conflict signal. No embedding or NLI needed.

2. **Staleness + orphan detection** — compare claim `verified_at` against source article file mtime (from `source_docs`). If the source article was modified after verification, the claim transitions to `stale`. Orphaned sentence_ids (IDs no longer in knowledge.db) are detected as a near-free byproduct. Uses file mtime rather than knowledge.db `created` dates because `created` is embed-time, not content-time, and sentence IDs are not stable across re-embeds.

3. **Cross-claim NLI conflicts** — parse claims from article files on disk via parseClaimMarkers (not from knowledge.db claim-type entries, which have empty article_slug). Embed claim text on-the-fly. Pairwise cosine similarity for cross-article pairs above threshold (0.7). Classify via existing classifyConflictPairs (agree/contradict/unrelated). Qwen NLI is supplementary to shared-evidence due to TNR <25% for contradiction detection.

**Separate tool from knowledge_conflicts** — claim conflicts have different semantics (metadata-enriched, lifecycle-aware). Separate `claim_conflicts` tool keeps concerns clean.

**Alternatives rejected:**
- Extending knowledge_conflicts to add claim awareness: conflates sentence-level and claim-level semantics
- Using knowledge.db claim-type entries for cross-claim NLI: article_slug is empty on those rows, making cross-article filtering impossible
- Staleness via knowledge.db `created` dates: embed-time timestamps don't reflect content freshness; sentence IDs aren't stable across re-embeds

## Consequences

- Claims gain three independent conflict signals: structural (shared evidence), temporal (staleness), and semantic (NLI)
- Shared-evidence is the highest-confidence vector (deterministic, no neural judge)
- Qwen NLI contradiction detection is bounded by TNR <25% — use as supplementary signal, not primary gate
- Cross-claim NLI requires on-the-fly embedding for each scan, which is slower than a pre-indexed approach but avoids the empty article_slug problem
- Orphan detection is a DISCOVERY addition beyond the original three vectors (near-free byproduct of staleness checking)
