---
title: "Phase 3a: Qwen Worker Baseline Experiments"
aliases: [phase-3a, qwen-experiments]
category: phases
tags: [local-worker, qwen, experiments]
parents: [phase-02-host-mode-runner]
created: 2026-04-25
updated: 2026-04-26
source: plan
status: completed
scope: ["docs/qwen-experiment-log.md", "scripts/qwen-bench.sh"]
entry_criteria: "llama-cpp server running with Qwen 3.6 model"
exit_criteria: "Experiment log documenting capabilities, failure modes, optimal prompt patterns, context budget sweet spot"
---

# Phase 3a: Qwen Worker Baseline Experiments

## Objective

Run 10-15 structured experiments with local Qwen 3.6 35B via llama-cpp to discover capabilities, failure modes, and optimal prompting patterns before building the dispatch framework.

## Scope

- Direct curl calls to llama-cpp endpoint
- 5 experiment categories: file ops, code impl, research synthesis, structured output, context utilization

## Exit Criteria

- [x] Experiment log with findings for all 5 categories
- [x] Failure mode taxonomy documented
- [x] Optimal prompt patterns identified

## Notes

Hardware: M1 Max 64GB, Qwen 3.6 35B A3B Q4_K_XL, ~40 tok/s measured.
