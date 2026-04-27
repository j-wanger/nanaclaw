---
title: "Phase 8: Operational Deployment + E2E Validation"
aliases: [phase-8, operational-deployment, e2e-validation]
category: phases
tags: [host-mode, deployment, e2e-testing, telegram, local-worker, memory, research-loop]
parents: [phase-07-hardening-wiki-bridge]
created: 2026-04-26
updated: 2026-04-27
source: plan
status: active (6/6 tasks done, pending user confirmation to complete)
scope: ["groups/*/container.json", "groups/*/memory/MEMORY.md", ".env", "src/container-runner.ts", "src/channels/telegram.ts", "src/delivery.ts", "src/router.ts", "container/agent-runner/src/**", "src/modules/memory/**"]
entry_criteria: "All phases 0-7 complete, agent groups exist, Telegram bot token configured, OneCLI running"
exit_criteria: "CLI→host-mode response, Telegram→response, dispatch_worker→verified result, memory persistence, research loop→episodic entry"
---

# Phase 8: Operational Deployment + E2E Validation

## Objective

Go from "code complete" to "daily driver" — validate the full message pipeline end-to-end in host mode, wire Telegram, connect the local worker, and run the first real research loop.

## Scope

Configuration:
- `groups/*/container.json` — add host-mode provider
- `groups/dm-with-wang/memory/MEMORY.md` — seed entries
- `groups/dm-with-wang/models.json` — llama-cpp routing
- `.env` — service URLs

Validation targets (read/debug, not planned edits):
- `src/container-runner.ts` — host-mode spawn path
- `src/channels/telegram.ts` — Telegram adapter
- `container/agent-runner/src/**` — agent-runner in host mode

## Exit Criteria

- [x] CLI message → host-mode spawn → coherent Claude response
- [x] Telegram message → host-mode spawn → response delivered to Telegram
- [x] dispatch_worker → llama-cpp → verified result in worker-results/
- [x] Memory writes persist across sessions (appear in next session's context fragment)
- [x] Research loop with web_search + wiki_write → episodic entry in knowledge-wiki

## Notes

Validation-first, fix-forward deployment. No new features — only integration testing, configuration, and bug fixes. Approach reviewed at 7/10 (revised per feedback), plan reviewed at 6/10 (task criteria fixed). Agent groups dm-with-wang and cli-with-wang already exist with Telegram bot token and OneCLI configured.
