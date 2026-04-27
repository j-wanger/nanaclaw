---
title: "Phase 5: SearXNG + Readability + Dynamic Wiki Routing"
aliases: [web-search-approach, searxng-decision, wiki-routing-decision]
category: decisions
tags: [web-search, mcp, research, knowledge-wiki, architecture]
parents: [phase-05-web-search-research]
created: 2026-04-26
updated: 2026-04-26
source: plan
confidence: medium
---

## Context

Phase 5 adds web search and deep research capabilities. Key constraints: two-tier architecture (Claude orchestrates, Qwen workers synthesize), MCP tool registration in container agent-runner, host-mode execution on M1 Max, multiple knowledge wikis registered in ~/.claude/wikis.json that need topic-based routing.

Evaluated Firecrawl (self-hosted search wraps SearXNG underneath, heavy infra: Redis+Postgres+Playwright), Brave Search API (free tier 2K/month, cloud-only), SearXNG (self-hosted meta-search, zero cost), DuckDuckGo (zero-config, lower quality). Studied NousResearch/hermes-agent for patterns: search-then-extract two-step, LLM content compression, multi-backend abstraction.

## Decision

**Search: SearXNG** (self-hosted HTTP API, same pattern as whisper-server/llama-server). Graceful degradation when unavailable.

**Content extraction: @mozilla/readability + linkedom** (lightweight DOM parser for Bun). Two-step pattern from Hermes Agent: `web_search` returns snippets+URLs, `web_extract` fetches full content as markdown.

**Wiki routing: dynamic via wikis.json** — `wiki_write` MCP tool reads registered wikis, scores topic keywords against descriptions, routes to best-match wiki's inbox/. Optional explicit `wiki_name` param overrides auto-routing.

**Worker integration: Claude-orchestrated** — Claude searches and extracts, includes content in dispatch_worker context field, Qwen synthesizes. No changes to dispatch module needed.

## Consequences

- SearXNG runs as persistent local service (Homebrew/Docker)
- Two new MCP tools (web_search, web_extract) + one wiki output tool (wiki_write)
- Research output lands in different wikis based on topic — agent decides routing
- Deep research skill teaches multi-step orchestration pattern
- Worker has no direct web access — Claude pre-fetches and passes content
