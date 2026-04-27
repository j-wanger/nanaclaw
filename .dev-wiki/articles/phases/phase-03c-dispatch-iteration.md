---
title: "Phase 3c: Dispatch Integration + Iteration"
aliases: [phase-3c, dispatch-iteration]
category: phases
tags: [local-worker, iteration, integration, multi-model]
parents: [phase-03b-dispatch-module]
created: 2026-04-25
updated: 2026-04-26
source: plan
status: completed
scope: ["container/agent-runner/src/mcp-tools/local-worker/**", "src/modules/local-worker/**", "src/container-runner.ts", "scripts/worker-e2e*.ts"]
entry_criteria: "Phase 3b complete"
exit_criteria: "5-10 real tasks completed, prompt templates refined, verification calibrated, routing selects correct endpoint by task type"
---

# Phase 3c: Dispatch Integration + Iteration

## Objective

Wire dispatcher into real workflows with host-side model routing infrastructure. Run 5-10 real tasks against live llama-cpp, refine prompts and verification from empirical results.

## Approach

Two-layer design: host-side model registry (loads models.json, injects routing config at spawn) + container-side routing table (task type → model URL with concurrency semaphore). Single-model config valid initially — multi-model becomes a config change, not code change.

E2E harness with ground truth labels enables FP/FN measurement for verification calibration.

## Exit Criteria

- [x] 5-10 real tasks completed (mix of research, code, analysis) — 10/10 pass
- [x] Prompt templates updated based on failures — validated, no changes needed (0 failures)
- [x] Verification thresholds calibrated from observed false positive/negative rates — 0 FP/FN, added not-contains check
- [x] Routing table selects correct model endpoint by task type — routing.ts tests pass
