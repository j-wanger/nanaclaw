---
title: "Phase 20: Summarize Pipeline Reliability Approach"
aliases: [summarize-pipeline-approach]
category: decisions
tags: [worker-dispatch, research-pipeline, state-management]
parents: [phase-20-summarize-pipeline-reliability]
created: 2026-04-30
updated: 2026-04-30
source: plan
confidence: medium
---

## Context

Nana's research session stalled at batch 41 of ~46 with ~545 AML articles remaining. Root cause: the singleton batch tracker (registerPendingBatch) was overwritten by each rapid-fire dispatch, leaving only the last batch's expected count. When that batch's workers completed, the tracker released, then subsequent results drip-fed with no gating. Without deep work active, the idle worker injection was the only wake mechanism — but the batch tracker blocked it, causing heartbeat staleness and session death.

## Decision

Tool-controlled stateful batching: research_summarize gains raw_dir + batch_size params with offset tracking in summarize-state.json. The tool owns bookkeeping (offset, dedup, progress), the agent just calls repeatedly until done. Batch tracker removed from summarize path entirely. research_review retains its own registerPendingBatch (single-batch, no overwrite problem). Dedup via source_url match against existing episodic frontmatter (not slug prediction — slugs diverge from filenames).

Rejected: (A) Making research_summarize synchronous — 15-minute blocking tool call has heartbeat issues. (B) Agent-controlled batching — fragile across compaction, lost Nana's position.

## Consequences

- research_summarize becomes self-sufficient for bulk operations — agent's job is "keep calling until done"
- summarize-state.json survives compaction and session death — agent can resume
- Compact output format (Phase 19) remains the spam prevention mechanism
- Batch tracker code reduced (only needed for research_review path)
