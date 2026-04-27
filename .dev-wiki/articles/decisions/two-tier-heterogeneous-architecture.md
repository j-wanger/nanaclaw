---
title: "Two-Tier Heterogeneous Architecture"
aliases: [heterogeneous-arch, claude-qwen-tiers]
category: decisions
tags: [architecture, local-worker, claude-sdk, qwen]
parents: [phase-00-fresh-fork-smoke-test]
created: 2026-04-25
updated: 2026-04-25
source: plan
confidence: high
---

## Context

Need to balance cost, capability, and latency across different task types. Claude (via Agent SDK subscription) excels at planning and review. Local Qwen 3.6 35B (via llama-cpp, ~15 tok/s on M1 Max) runs at zero marginal cost for worker tasks.

## Decision

Two-tier architecture: Claude Agent SDK (Tier 1) as architect/planner/reviewer, local Qwen via llama-cpp (Tier 2) as worker for research, code implementation, and routine analysis. Coordination via structured task contracts.

## Consequences

- Claude handles planning, review, and complex reasoning
- Qwen handles bulk research, code from specs, and analysis at zero marginal cost
- Requires contract-based dispatch module (Phase 3b) and empirical prompt tuning (Phase 3a)
- Worker quality bounded by Qwen's capabilities — Claude reviews all worker output
- Latency for worker tasks is 5-60s (Qwen inference), acceptable for async workflows
