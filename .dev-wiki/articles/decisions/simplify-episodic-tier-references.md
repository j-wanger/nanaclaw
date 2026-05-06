---
title: "Simplify Episodic Tier References"
aliases: [episodic-tier-simplification]
category: decisions
tags: [knowledge-pipeline, episodic, documentation]
parents: [phase-43-knowledge-pipeline-instruction-cleanup]
created: 2026-05-06
updated: 2026-05-06
source: plan
confidence: medium
---

## Context

The episodic tier was previously fed by research_summarize (deleted in Phase 42). Raw tier stays (research_fetch writes there). Instructions referencing episodic as an active pipeline stage are now misleading.

## Decision

Simplify episodic tier description to "legacy, not actively fed by pipeline" rather than removing it entirely. The tier concept may still be useful if future article workflows produce intermediate outputs, and existing episodic data in wikis should remain discoverable.

## Consequences

- Episodic tier remains in the content model as a documented but inactive tier.
- No data deletion — existing episodic articles stay in place.
- If a future phase reactivates episodic output, the tier description can be updated rather than re-introduced.
- Medium confidence because the "keep as legacy" approach could become confusing if episodic is never reactivated — full removal would be cleaner in that case.
