---
name: research
description: Iterative research pipeline. research_fetch for search/extract/dedup, research_summarize for 1:1 episodic articles, research_review for source-faithful scoring. All mechanical — Nana thinks about directions, tools do the work.
writes:
  research-state.json: workspace state file (created/updated/deleted during pipeline)
  wiki raw/articles/*.md: raw extracted sources via research_fetch
  wiki episodic/*.md: per-source summaries via research_summarize → write_to
---

# Research Pipeline

Your job is to **think about research directions and evaluate coverage**. The tools do everything else mechanically. You never read raw article bodies — you work from metadata (titles, URLs, quality).

## Communication

Talk naturally. No pipeline jargon, no tool names, no token counts in messages. Tell the user what you found, what gaps remain, and what you're doing about it.

## Trigger Patterns

- "research X", "look into Y", "investigate Z", "find out about"
- "what's the state of", "deep dive on", "survey"
- Scheduled task with research topic

## Tools

| Tool | What it does | Your job |
|------|-------------|----------|
| `wiki_search` | Search existing wiki articles | Evaluate existing coverage |
| `research_fetch` | Search web → fetch → dedup → write raw articles | Generate good queries |
| `research_summarize` | 1 raw article → 1 summarize worker → 1 episodic article | Pass the paths from research_fetch |
| `research_review` | 1 episodic → 1 review worker (source-vs-summary) | Pass the episodic paths |

## Pipeline

### 1. Plan

Write `research-state.json` first:
```json
{
  "topic": "...", "target_wiki": "...",
  "existing_coverage": [], "queries_executed": [],
  "raw_articles": [], "episodic_articles": [],
  "stage": "fetch", "started_at": "..."
}
```

Call `wiki_search` to check existing coverage. Identify gaps.

### 2. Fetch (Iterative Loop)

This is where you add value — generating good, targeted queries.

```
loop (max 4 rounds):
  1. Think: what specific gaps remain?
  2. Generate 1-2 targeted queries
  3. Call research_fetch(query) for each
  4. Read the response metadata: titles, URLs, quality (full/partial), char counts
  5. Do NOT read the raw article files — use metadata to evaluate coverage
  6. Decide: enough coverage, or need more queries?
```

`research_fetch` returns per-article metadata:
```json
{
  "articles": [
    {"path": "...", "title": "Bill C-12...", "url": "https://...", "quality": "full", "chars": 9682},
    ...
  ],
  "full": 8, "partial": 3, "skipped": 2, "failed": 1
}
```

Use titles and URLs to judge coverage. Partial articles exist but have thin content.

Update `research-state.json` with paths after each round.

### 3. Summarize

When you have enough raw sources, call `research_summarize`:

```
research_summarize({
  paths: [all raw article paths from research-state.json],
  wiki: "<target_wiki>",
  tags: ["<relevant>", "<tags>"]
})
```

This mechanically dispatches one worker per raw article (skipping partials). You don't choose which articles to group or skip — the tool handles it.

**END YOUR TURN after calling research_summarize.** Worker results auto-inject.

### 4. Review

When summarize results arrive, collect the episodic paths from the worker results and call `research_review`:

```
research_review({
  episodic_paths: [paths to new episodic articles],
  wiki: "<target_wiki>",
  raw_dir: "<wiki_path>/raw/articles"
})
```

This dispatches one reviewer per episodic article, comparing each against its raw source. Reviewers score faithfulness to source only — not factual accuracy.

**END YOUR TURN after calling research_review.** Results auto-inject.

### 5. Report

When review results arrive, tell the user:
- How many sources found (full vs partial)
- How many summaries written, review pass/fail
- What topics are covered (from titles, not from reading content)
- What gaps remain
- Partial URLs that couldn't be fully extracted

Delete `research-state.json`.

No consolidation — that's wiki-consolidate's job later.

## Error Handling

| Failure | Action |
|---------|--------|
| research_fetch returns 0 articles | Different query, max 1 retry |
| Worker timeout | Note in report |
| All queries return nothing | Tell user, delete state |

## Compaction Recovery

Read `research-state.json`. Resume from `stage`. Missing file = done.

## Output Routing

Research → wiki only. Never MEMORY.md.
