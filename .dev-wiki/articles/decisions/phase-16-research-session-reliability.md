---
title: "Phase 16: Research Session Reliability"
aliases: [phase-16-decision, compact-research-outputs]
category: decisions
tags: [research, context-engineering, deep-work, communication]
parents: [phase-16-research-session-reliability]
created: 2026-04-29
updated: 2026-04-29
source: plan
confidence: medium
---

## Context

6-hour deep work research session revealed 4 reliability issues: (1) research_fetch returns full per-article metadata (path, title, URL, quality, chars) causing 3 context compactions over 73 rounds, (2) agent stopped at 2 hours instead of 6 — called end_deep_work after initial topics covered, (3) no progress updates sent to user during autonomous work, (4) review stage inert because episodic articles lack source_url for matching.

## Decision

Four-track fix: compact tool outputs (code), fix review source matching (code), add communication guidance (skill), improve deep work awareness in research skill (skill).

Track 1 — Compact tool outputs: research_fetch returns `{added, skipped, failed, titles: [new titles]}` instead of full per-article metadata. research_summarize returns `{dispatched, skipped, review_args}` without per-worker arrays. research_review returns `{dispatched, skipped}` only. Agent evaluates coverage from titles + wiki_search + research-state.json.

Track 2 — Fix review source_url propagation: write_to episodic post-processing reads source_url from the raw article's frontmatter and propagates it to the episodic article frontmatter. findRawSource then matches correctly.

Track 3 — Skill communication: research SKILL.md adds send_message guidance for progress updates. Deep work awareness section instructs agent to keep researching until coverage is genuinely saturated or deadline approaches.

Track 4 — No code changes to deep work continuation — the while loop works correctly. Early termination was a prompt/skill issue.

Alternatives rejected:
- Stream tool results to file + agent reads on demand: more robust but over-engineered for the problem (titles-in-response is sufficient)
- Programmatic coverage tracking in research_fetch: breaks orchestrator-decides-coverage principle from Phase 15 decision

## Consequences

- ~70% reduction in research tool context footprint (titles only vs full metadata)
- Review stage becomes functional (source_url propagation)
- Users get progress visibility during long research sessions
- Agent keeps working through 6-hour sessions instead of stopping at 2
- research-state.json becomes the authoritative path store (already was, now formalized)
