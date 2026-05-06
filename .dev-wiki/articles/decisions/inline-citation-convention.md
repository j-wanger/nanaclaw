---
title: "Inline Citation Convention for Wiki Articles"
aliases: [citation-convention, wiki-provenance]
category: decisions
tags: [wiki, citations, provenance, convention]
parents: [phase-42-pipeline-simplification]
created: 2026-05-05
updated: 2026-05-05
source: debrief
confidence: high
---

## Context

Phase 42 deleted all claim provenance tools (claim_link, claim_conflicts, claim_reconcile, etc.). These tools provided structured provenance metadata linking article claims to raw source sentences via NLI scoring. With claims deleted, a simpler provenance mechanism was needed that preserves grep-able traceability without new infrastructure.

## Decision

When Claude writes articles via wiki_write, include `sources: [slug1, slug2]` in frontmatter AND inline `[source-slug]` citations at sentence level. This is a convention, not a tool — no new infrastructure needed.

Example:
```yaml
---
sources: [fatf-red-flags-2023, egmont-tbml-typologies]
---
```
```markdown
Shell companies are the most common vehicle for layering [fatf-red-flags-2023]. Trade-based schemes frequently use over-invoicing [egmont-tbml-typologies].
```

## Consequences

- Provenance is preserved through simple text markers, grep-able across the wiki.
- No runtime cost — convention enforced by prompt instructions, not code.
- Future verification tooling can parse `[slug]` markers programmatically if needed.
- STORM research shows ~85% citation accuracy for single-pass synthesis — acceptable for curated articles with human review.
- Codification needed: update wiki-manager instructions and/or schema to specify the convention.
