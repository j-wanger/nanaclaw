---
title: "Phase 17: Message Batching + Research Extraction Resilience"
aliases: [phase-17-decision, accumulation-window, jina-fallback]
category: decisions
tags: [poll-loop, extraction, searxng, jina, telegram]
parents: [phase-17-message-batching-extraction-resilience]
created: 2026-04-29
updated: 2026-04-29
source: plan
confidence: medium
---

## Context

Bob agent produced two separate responses to a single user intent — a forwarded Telegram post and its caption arrived as two messages 400ms apart, and the poll loop started a query on the first before the second landed in the DB. Separately, research sessions generating ~3000 raw articles/hour are rate-limiting upstream SearXNG engines (872 events: Brave TooManyRequests, Google rate-limited, Startpage CAPTCHA, Karmasearch permanently 403'd). ~4.3% of raw articles get partial extraction from JS-heavy pages.

## Decision

Three-track fix:

Track 1 — Poll-loop accumulation window: after getPendingMessages() finds trigger=1 messages, wait 500ms and re-read to capture rapid-fire follow-ups before starting the provider query. Universal 500ms delay — imperceptible in chat UX, catches multi-part Telegram sends. Entirely in container-side poll-loop.ts.

Track 2 — Jina reader fallback: add tryJinaExtract(url, maxChars) that fetches r.jina.ai/<url> with Accept: text/plain. In research-fetch.ts fetchAndWrite() and web-extract.ts extractHandler(): when Readability produces <500 chars, try Jina before falling back to SearXNG snippet/raw text. Configurable via JINA_READER_ENABLED env var (default: true). Free tier 20 RPM sufficient for fallback usage.

Track 3 — SearXNG engine diversification: update data/searxng/settings.yml to enable Bing, Mojeek, Qwant; disable Karmasearch (dead). Increases general web engines from 4 to ≥6, spreading query load and reducing per-engine rate limiting.

Alternatives rejected:
- Router-side debounce: more complex, host-side changes, adds latency to ALL messages
- Jina as primary extraction: unnecessary — Readability works on most pages
- Per-engine rate limiting in SearXNG: it already auto-suspends failed engines; the issue is having too few engines

## Consequences

- Multi-part Telegram messages (forward + caption) always batched into single agent query
- 500ms added to first-message latency for ALL messages (universal, not adaptive) — acceptable for chat
- ~4.3% partial extraction rate should decrease (Jina catches JS-heavy pages Readability misses)
- Research sessions spread query load across more engines, reducing rate-limit suspensions
- New dependency on Jina's free tier — graceful degradation (null return) if unavailable
