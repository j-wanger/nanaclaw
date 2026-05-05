---
title: "Phase 33: Claim Markers + Contextual Sentence Embeddings Complete"
created: 2026-05-04
category: journal
tags: [knowledge-architecture, claim-provenance, embeddings]
---

# Phase 33: Claim Markers + Contextual Sentence Embeddings Complete

## Summary

Completed 7/7 tasks across two parallel workstreams in one session. Established claim provenance convention in knowledge-wiki and upgraded sentence embeddings with richer contextual prefixes. First phase of the 6-phase Option B architecture ("Wiki as Primary, Sentences as Index").

## What Was Done

**Workstream A (knowledge-wiki, 4 tasks):**
- Created `claim-spec.md` — canonical claim system spec with ID format, inline markers, frontmatter schema, advisory-only lifecycle
- Updated `article-conventions.md` — added `claims:` frontmatter section with requirements by article status
- Updated `writer-prompt.md` — claim marker instructions + self-review check
- Added wiki-health checks 14 (marker integrity, ERROR) and 15 (claim coverage, WARNING)
- Updated `reviewer-checklist.md` — check 13 + score format N/13

**Workstream B (Nanaclaw, 2 tasks):**
- Extracted `buildContextPrefix()` function, changed format from `[title | section]` to `"Document: {title}. Section: {section}."`
- Added `contextual_text` to `knowledge_search` results

**Integration (1 task):**
- Installed all modified skills to `~/.claude/skills/`
- TypeScript typecheck clean

## Also Done This Session

- Committed Phases 28-32 work (memory MCP server, +4517/-269 lines, 59 files)
- PII cleanup: anonymized test data (Jake→Alice), added Python gitignore entries, excluded memory-profile.md
- Restarted NanaClaw service with memory MCP wiring

## Decisions

- [[phase-33-claim-markers-contextual-embeddings-approach]] — combined Phases 1+2 from Option B plan into single dev-wiki phase

## Review Gate

Reviewer score: 7/10, verdict: revise. 3 HIGH (all state-sync: stale tool description, progress fields at 0%, unchecked exit criteria) + 2 MEDIUM (stale preamble comment, missing self-review item). All fixed inline.

## Exit Criteria Status

7/8 met. Remaining: "test article with 5+ claim markers passes wiki-health without errors" — requires running wiki-absorb on real content to produce markers, then running wiki-health. Deferred to next session as live test.

### Activation Quality

Active knowledge: 3 entries (Option B architecture, Contextual Embeddings, Wiki-Health Check Architecture). All 3 referenced during implementation (~100% hit rate).
