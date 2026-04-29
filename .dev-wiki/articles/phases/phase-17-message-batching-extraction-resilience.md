---
title: "Phase 17: Message Batching + Research Extraction Resilience"
aliases: [phase-17]
category: phases
tags: [poll-loop, extraction, searxng, jina, telegram]
parents: []
created: 2026-04-29
updated: 2026-04-29
source: plan
status: active
scope: ["container/agent-runner/src/poll-loop.ts", "container/agent-runner/src/mcp-tools/research-fetch.ts", "container/agent-runner/src/mcp-tools/web-extract.ts", "data/searxng/settings.yml"]
entry_criteria: "Phase 16 complete, Bob agent operational, SearXNG running"
exit_criteria: "Poll loop batches rapid-fire messages (≤1s gap); partial extractions try Jina before snippet; SearXNG has ≥6 general web engines; build+tests pass"
---

# Phase 17: Message Batching + Research Extraction Resilience

## Objective

Fix Bob's duplicate response on multi-part Telegram messages by adding a poll-loop accumulation window, improve web extraction quality with Jina reader fallback for JS-heavy pages, and diversify SearXNG search engines to reduce upstream rate limiting during heavy research sessions.

## Scope

Files and modules affected:
- `container/agent-runner/src/poll-loop.ts` — accumulation window
- `container/agent-runner/src/mcp-tools/research-fetch.ts` — Jina fallback in fetchAndWrite
- `container/agent-runner/src/mcp-tools/web-extract.ts` — Jina fallback in extractHandler
- `data/searxng/settings.yml` — engine diversification

## Exit Criteria

- [ ] Poll loop batches rapid-fire messages (≤1s gap) into single agent query
- [ ] Partial extractions (<500 chars) attempt Jina reader before falling back to snippet
- [ ] SearXNG has ≥6 enabled general web search engines
- [ ] Build + all tests + container typecheck pass

## Notes

Root cause of Bob's duplicate response: Telegram forwards a post + caption as two messages ~400ms apart. Poll loop picks up first message before second lands in DB, starts separate query. Agent responds to each independently — one missing the user's question context.

SearXNG rate limiting: 872 events across engines during research sessions (~3000 articles/hour). Brave (140 TooManyRequests), Google (114), Karmasearch (156 AccessDenied, permanently dead), Startpage (13 CAPTCHA). Only 4 working general web engines concentrate all query load.

Jina Reader free tier: 20 RPM unauthenticated, 200 RPM with free API key. Sufficient for fallback-only usage (~5% of fetches are partial).
