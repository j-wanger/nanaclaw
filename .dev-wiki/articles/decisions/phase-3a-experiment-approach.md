---
title: "Phase 3a Experiment Approach"
aliases: [qwen-experiment-approach, structured-experiments]
category: decisions
tags: [qwen, experiments, local-worker]
parents: [phase-03a-qwen-experiments]
created: 2026-04-26
updated: 2026-04-26
source: plan
confidence: high
---

## Context

Phase 3a needs to characterize Qwen 3.6 35B A3B capabilities before building the dispatch framework in Phase 3b. Two approaches considered: (A) ad-hoc manual curl experiments with narrative notes, or (B) automated runner with structured decision tables.

## Decision

Approach B: 12 structured experiments across 5 categories (file ops, code impl, synthesis, structured output, context utilization), each run in standard + thinking mode with 3 trials per configuration. Automated bash runner captures latency, token counts, and response content. Results documented as structured decision tables with machine-parseable verdicts for Phase 3b consumption. Includes constrained-prompting variant for structured output experiments per wiki reliability primitives.

## Consequences

- Phase 3b gets concrete capability boundaries instead of prose descriptions
- Experiments are reproducible — can re-run after model/quant changes
- Adds scripts/qwen-bench.sh to project (minimal, ~50 lines)
- Model is Q4_K_XL (not Q6 as originally spec'd) — results may differ at higher quant
- Failure taxonomy uses wiki's 6 primary modes as classification schema
