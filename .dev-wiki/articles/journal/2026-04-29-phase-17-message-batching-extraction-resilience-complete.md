---
title: "Phase 17: Message Batching + Research Extraction Resilience Complete"
category: journal
tags: [poll-loop, extraction, searxng, jina, telegram, phase-17]
created: 2026-04-29
phase: 17
tasks_completed: 6
tasks_added: 0
tasks_blocked: 0
decisions: 1
---

# Phase 17: Message Batching + Research Extraction Resilience Complete

## Summary

Investigated and fixed Bob's duplicate response issue (root cause: Telegram splits forwarded posts + captions into two messages ~400ms apart), added Jina Reader as extraction fallback for JS-heavy pages, and diversified SearXNG search engines to reduce upstream rate limiting during heavy research sessions.

## Changes

### Track 1: Message Accumulation Window
- Added `ACCUMULATION_WINDOW_MS = 500` to poll-loop.ts — after detecting trigger messages in idle state, waits 500ms and re-reads to capture rapid-fire follow-ups before starting provider query
- Added `AbortSignal` support to `runPollLoop` and `processQuery` (DISCOVERY: pre-existing test isolation bug where infinite poll loop leaked between test cases, exposed by the accumulation delay)
- Existing mid-query `push()` mechanism unaffected — handles follow-ups arriving during active queries independently

### Track 2: Jina Reader Fallback
- Created shared `jina.ts` module with `tryJinaExtract(url, maxChars, minLength?)` — fetches via `r.jina.ai/<url>`, graceful null on failure, configurable via `JINA_READER_ENABLED` env var, optional `JINA_API_KEY` for higher rate limits
- Integrated in `research-fetch.ts:fetchAndWrite()` — when Readability produces <500 chars, tries Jina before snippet fallback; re-checks threshold after Jina (Jina result may still be insufficient)
- Integrated in `web-extract.ts:extractHandler()` — same <500 char threshold triggers Jina fallback

### Track 3: SearXNG Engine Diversification
- Updated `data/searxng/settings.yml` — disabled karmasearch (permanently 403'd, 156 errors), enabled Bing, Mojeek, Qwant
- Web search engines increased from 4 to 7 (Google, DuckDuckGo, Brave, Startpage, Bing, Mojeek, Qwant)
- Bing confirmed returning results immediately after restart

## Investigation Findings

### Bob Duplicate Response Root Cause
- Session DB (inbound.db seq 6 and 8): two messages at 07:45:18.525 and 07:45:18.919 (400ms gap)
- seq 6: forwarded post text ("Applying this ratio...")
- seq 8: user's actual question ("Take a look at the post below...")
- Agent produced two separate responses — seq 9 analyzed the post text only, seq 11 compared to research skill
- Root cause: poll loop picked up seq 6 before seq 8 landed in DB, started separate query

### SearXNG Rate Limiting
- 872 rate-limiting events in Docker logs across research sessions (~5,887 raw articles)
- Brave: 140 TooManyRequests, Google: 114, Karmasearch: 156 AccessDenied (dead), Startpage: 13 CAPTCHA
- 4.3% partial extraction rate across aml-wiki (100/2870) and trading-wiki (153/3017)

## Escape Hatches

- **DISCOVERY**: AbortSignal support added to poll loop — not in original task scope, but needed to fix pre-existing test isolation bug exposed by the accumulation window change

## Health Delta

- Container tests: 274 → 289 (+15 new tests)
- Host tests: 366 (unchanged)
- New files: jina.ts, jina.test.ts
- Container typecheck: clean
- Host build: clean

### Activation Quality

Active knowledge: 4 entries, 3 referenced (~75% approximate hit rate, literal match).
- Referenced: context-compaction-strategies (extraction quality discussion), fail-open-vs-fail-stop (Jina fallback design), pre-query hold clarity (accumulation window design)
- Not referenced: SearXNG selective override syntax (used but not explicitly cited)

### Review Gate

Reviewer: 9/10, verdict: accept.
- [LOW] deep work `while (true)` loop doesn't check signal.aborted before 3s sleep — pre-existing, signal makes gap more visible
- [LOW] Jina-upgraded extractions retain `source: web-extract` in frontmatter instead of `source: jina-reader` — minor provenance gap
- Suggestions: add signal check in deep work loop, log jina-reader source, comment in settings.yml for karmasearch disable reason
