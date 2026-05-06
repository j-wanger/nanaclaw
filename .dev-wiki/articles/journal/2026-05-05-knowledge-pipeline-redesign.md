---
title: "Knowledge Pipeline Redesign Discussion"
aliases: []
category: journal
tags: [knowledge-pipeline, architecture, articles, citations, design]
parents: [phase-42-pipeline-simplification]
created: 2026-05-05
updated: 2026-05-05
source: debrief
---

# Knowledge Pipeline Redesign Discussion

## What Happened
- Post-Phase 42 design discussion about the future of the knowledge pipeline now that Qwen-dependent tools are removed
- Decided articles become an optional curated view layer — Claude writes them directly with inline citations, not a multi-stage Qwen pipeline
- Established inline citation convention: `sources: [slug1, slug2]` in frontmatter + `[source-slug]` sentence-level citations in body
- Key insight: claim extraction was an intermediate representation compensating for Qwen's inability to do end-to-end synthesis; Claude eliminates the need
- Identified 5 tasks for next phase: update wiki-manager SKILL.md, knowledge-routing.md, instructions.md, codify citation convention, update article lifecycle description

## Decisions Made
- [[knowledge-pipeline-post-phase-42-design|Knowledge Pipeline Post-Phase 42 Design]] — high confidence. Articles become optional curated layer, sentence embeddings primary substrate
- [[inline-citation-convention|Inline Citation Convention]] — high confidence. Convention-based provenance via frontmatter + inline markers

## Open Questions
- Exact scope of skill/instruction file updates needed for next phase (wiki-manager, knowledge-routing, instructions)

## Artifacts Changed
- No code changes — design decisions only

## Soft Observations / Phase N+1 Candidates
- DELEGATE-52 corruption (25% over 20 edits) applies to iterative revision loops, not single-pass synthesis. STORM ~85% citation accuracy is the relevant reference. If iterative article revision is later added (wiki-reorg on curated articles), verification tooling becomes operationally needed at that point.
- Principle: don't build intermediate representations to compensate for model weakness when a stronger model eliminates the need. This generalizes beyond the knowledge pipeline to other pipeline designs.

## Related
- [[phase-42-pipeline-simplification|Phase 42: Pipeline Simplification]] — parent phase (completed)
- [[phase-42-pipeline-simplification-approach|Pipeline Simplification Approach]] — prior decision on what to delete
