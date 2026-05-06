---
title: "Phase 43: Knowledge Pipeline Instruction Cleanup"
aliases: [instruction-cleanup, wiki-doc-cleanup]
category: phases
tags: [documentation, wiki, knowledge-pipeline, instructions]
parents: [phase-42-pipeline-simplification]
created: 2026-05-06
updated: 2026-05-06
source: plan
status: completed
scope: ["container/skills/wiki-manager/*", "container/skills/research/*", "~/.claude/skills/knowledge-wiki/*"]
entry_criteria: "Phase 42 complete, all claim tools deleted, pipeline simplified"
exit_criteria: "Zero grep matches for deleted tool names across all skill instruction files. Inline citation convention documented. Article lifecycle reflects human review model."
---

# Phase 43: Knowledge Pipeline Instruction Cleanup

## Objective

Update wiki skill instructions, knowledge-routing table, and article lifecycle documentation to reflect the simplified pipeline (sentence embeddings as primary substrate, 3 knowledge tools, articles as optional Claude-written view with inline citations). Remove all references to deleted claim tools and Qwen-dependent pipeline.

## Scope

Files and modules affected:
- `container/skills/wiki-manager/SKILL.md`
- `container/skills/wiki-manager/instructions.md`
- `container/skills/wiki-manager/knowledge-routing.md`
- `~/.claude/skills/knowledge-wiki/article-conventions.md`
- `~/.claude/skills/knowledge-wiki/content-model.md`

## Exit Criteria

- [ ] No references to claim_link, claim_conflicts, claim_reconcile, claim_search, research_summarize in any scope file
- [ ] No references to wiki-consolidate in scope files
- [ ] knowledge-routing.md reflects surviving tools only (~6 rows)
- [ ] Article lifecycle describes human review model (no automated NLI)
- [ ] Inline citation convention codified in wiki-manager instructions
- [ ] Episodic tier documented as legacy, not active pipeline stage

## Notes

Design decisions already captured: [[knowledge-pipeline-post-phase-42-design]] and [[inline-citation-convention]].
Planning decisions: [[include-knowledge-wiki-files-in-scope]] and [[simplify-episodic-tier-references]].
This phase is documentation/instruction cleanup only — no code changes.
