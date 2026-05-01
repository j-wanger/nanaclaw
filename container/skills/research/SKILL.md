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

**Progress updates:** During iterative fetch loops, call `send_message` every ~5 rounds with a brief update — what topics you've covered, how many articles added, what direction you're heading next. The user should never wonder if you're still working.

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
loop:
  1. Think: what specific gaps remain?
  2. Generate 1-2 targeted queries
  3. Call research_fetch(query) for each
  4. Read the response: titles and URLs for coverage direction, counts for progress
  5. Do NOT read the raw article files — use metadata to evaluate coverage
  6. Decide: enough coverage, or need more queries?
  7. Every ~5 rounds: send_message with a brief progress update
```

`research_fetch` returns compact metadata:
```json
{
  "added": 8, "skipped": 2, "failed": 1, "full": 7, "partial": 1,
  "new_articles": [
    {"title": "Bill C-12...", "url": "https://..."},
    ...
  ]
}
```

Use titles and URLs to judge coverage direction. The response includes `raw_dir` and `wiki` — save these for the summarize step.

Update `research-state.json` after each round with `raw_dir`, `wiki`, and topics covered.

### 3. Summarize

Call `research_summarize` with `raw_dir` — the tool handles batching, dedup, and progress:

```
research_summarize({
  wiki: "<wiki name>",
  raw_dir: "<path to raw/articles/>",
  batch_size: 60,
  tags: ["<relevant>", "<tags>"]
})
```

The tool automatically:
- Skips articles already summarized (source_url match against episodic dir)
- Skips partial/invalid extractions
- Dispatches `batch_size` unsummarized articles as workers
- Tracks progress in `summarize-state.json`
- Returns `{dispatched, skipped_existing, skipped_partial, remaining}`

**Bulk summarization (hundreds/thousands of raws):** Keep calling `research_summarize` with the same `raw_dir` until `remaining` is 0. The tool tracks what's done — you don't need to manage offsets or file lists. After each batch completes, call again for the next batch.

- Don't message the user for each batch. Send a progress update every ~5 batches.
- On compaction recovery: just call `research_summarize` again — it reads `summarize-state.json` and resumes.
- When `remaining` reaches 0, the tool deletes `summarize-state.json`.

The response includes a `review_args` object — save it for the review step.

**Claim extraction:** Workers now automatically extract atomic claims (tagged `[CLAIM]`) alongside summaries. Claims are stored in `<wiki>/claims.jsonl` — no agent action needed. This happens mechanically in the post-processing step.

**END YOUR TURN after calling research_summarize.** Worker results auto-inject.

### 4. Review

When summarize results arrive, immediately call `research_review` using the `review_args` from the summarize response. Do NOT ask the user whether to review — review is automatic.

```
research_review(review_args)
```

The `review_args` from `research_summarize` has everything pre-filled. Each reviewer compares one summary against its raw source — faithfulness only, not fact-checking.

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

## Claim Backfill

For bulk claim extraction from existing raw articles without producing episodic articles:

```
loop:
  1. research_summarize({ wiki, raw_dir, batch_size: 60, claims_only: true })
  2. END YOUR TURN — workers auto-complete
  3. When results arrive: check remaining count
  4. If remaining > 0: call research_summarize again (same args — state file tracks progress)
  5. If remaining == 0: call claim_embed({ wiki }) to vectorize claims.jsonl → claims.db
  6. Validate: claim_search({ wiki, query: "<known topic>" }) — verify relevant results
  7. Optional: claim_dedup({ wiki }) — find near-duplicate claim pairs
```

`claims_only=true` extracts [CLAIM] tags only — no ## Summary, no episodic article. Claims append to `<wiki>/claims.jsonl`. State file (`summarize-state.json`) survives session boundaries.

## Error Handling

| Failure | Action |
|---------|--------|
| research_fetch returns 0 articles | Different query, max 1 retry |
| Worker timeout | Note in report |
| All queries return nothing | Tell user, delete state |

## Deep Work Awareness

When research runs inside a deep work session (you have a `deep_work.json` deadline):

- **Don't stop after your initial topic list is covered.** Explore adjacent areas, deeper subtopics, different angles on the same domain. The time budget is your guide, not the initial query list.
- **Batch your work:** fetch in rounds, then summarize in batches, then review. Don't try to summarize after every single fetch round.
- **Check `get_deep_work_status` periodically** to gauge remaining time. In the last 30 minutes, shift to summarizing and reviewing whatever you've collected rather than fetching more.

## Compaction Recovery

Read `research-state.json`. Resume from `stage`. Missing file = done.

## Output Routing

Research → wiki only. Never MEMORY.md.
