---
title: "Phase 3a: Qwen Experiments Complete"
aliases: []
category: journal
tags: [qwen, experiments, local-worker, phase-3a]
parents: [phase-03a-qwen-experiments]
created: 2026-04-26
updated: 2026-04-26
source: debrief
---

# Phase 3a: Qwen Experiments Complete

## What Happened
- Planned Phase 3a (7 tasks, 4S+3M) with cross-wiki retrieval from agentic-engineering-wiki (7 articles, approach reviewer 7→revised, plan reviewer 7→revised)
- Built experiment runner (scripts/qwen-bench.sh) and ran 12 structured experiments across 5 categories with 36 total trials
- All 36 trials passed — Qwen 3.6 35B A3B Q4_K_XL is remarkably reliable at temp=0 for bounded, tool-mediated tasks
- Discovered thinking mode selectively engages: only for diagnostic/analytical tasks (Exp 5 bug fix: 876 tok, Exp 8 comparison: 1682 tok), not for generation/extraction/mechanical tasks
- Structured JSON output works perfectly at 10+ nested fields without constrained decoding
- Context retrieval perfect through 32K; sweet spot for worker dispatch: 4K-8K tokens

## Decisions Made
- [[phase-3a-experiment-approach|Phase 3a Experiment Approach]] — structured decision tables over narrative, automated runner, 12 experiments × 2 modes

## Problems Solved
- Wiki article paths: articles live in `articles/patterns/` and `articles/concepts/`, not flat `articles/` — discovered during cross-wiki retrieval

## Artifacts Changed
- `scripts/qwen-bench.sh` (new: experiment runner with timing, token capture, 3-trial loop)
- `docs/qwen-experiment-log.md` (new: 12 experiments, 36 trials, 4 synthesis sections)
- `scripts/prompts/*.json` (new: 18 experiment prompt files)
- `.dev-wiki/articles/decisions/phase-3a-experiment-approach.md` (new)

## Review Gate
Reviewer score: 6/10, verdict: revise. HIGH issues were stale compaction anchors (expected pre-debrief, fixed during debrief). MEDIUM: failure taxonomy now uses canonical wiki labels. LOW: script arg order, methodology noting averages vs medians.

### Activation Quality
Active knowledge: 6 entries, 6 referenced (~100% approximate hit rate, literal match).

## Soft Observations / Phase N+1 Candidates
- Thinking mode temp sensitivity: thinking engages at temp=0 only for diagnostic/analytical tasks; may need temp>0 for other task types | Phase 3b experiment: re-run Exp 5 at temp=0.6 | Exp 5/8 thinking results
- Instruction strength asymmetry: "ONLY valid JSON" is 100% compliant but "ONLY code, no fences" is ~50% | Phase 3b: strip markdown fences in post-processing for code output | Exp 1, 4, 6 results
- KV-cache prefix sharing: cold-start is the latency bottleneck (9s at 32K), warm queries are <1.2s | Phase 3b: implement shared system prompt prefix for worker dispatch | Exp 11 context results

## Related
- [[phase-03a-qwen-experiments|Phase 3a: Qwen Worker Baseline Experiments]]
