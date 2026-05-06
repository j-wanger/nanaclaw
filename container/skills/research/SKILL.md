---
name: research
description: Research pipeline. research_fetch for search/extract/dedup. knowledge_embed for sentence-level embeddings. knowledge_search + knowledge_conflicts for retrieval and analysis. Nana thinks about directions, tools do the work.
writes:
  research-state.json: workspace state file (created/updated/deleted during pipeline)
  wiki raw/articles/*.md: raw extracted sources via research_fetch
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
| `knowledge_embed` | Embed article sentences into knowledge.db | Run after fetch to make content searchable |
| `knowledge_search` | Semantic search across embedded sentences | Find specific facts |
| `knowledge_conflicts` | Cross-article contradiction detection | Analyze quality and consistency |

## Pipeline

### 1. Plan

Write `research-state.json` first:
```json
{
  "topic": "...", "target_wiki": "...",
  "existing_coverage": [], "queries_executed": [],
  "raw_articles": [],
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

Use titles and URLs to judge coverage direction. The response includes `raw_dir` and `wiki` — save these for the embed step.

Update `research-state.json` after each round with `raw_dir`, `wiki`, and topics covered.

### 3. Embed

After fetching, embed all articles into the sentence-level vector store:

```
knowledge_embed({ wiki: "<wiki name>", source: "raw" })
```

This splits every article into sentences, embeds each with contextual prefix `[title | section]`, and stores in `knowledge.db`. Incremental — tracks processed articles in `sentence-embed-state.json`.

### 4. Report

Tell the user:
- How many sources found (full vs partial)
- What topics are covered (from titles, not from reading content)
- What gaps remain
- Partial URLs that couldn't be fully extracted

Delete `research-state.json`.

## Knowledge Search

Search the embedded store with:
```
knowledge_search({ wiki: "<wiki name>", query: "<search text>" })
```

Returns similarity scores + source metadata with surrounding sentence context.

## Knowledge Analysis

### Conflict Detection

Find cross-article sentences that say similar things — potential contradictions or duplicates:

```
knowledge_conflicts({ wiki: "<wiki name>", article_slug: "<slug>", threshold: 0.8, classify: true })
```

Returns pairs of similar sentences from different articles. With `classify: true` (default), a Qwen worker labels each pair as `agree`, `contradict`, or `unrelated`. With `classify: false`, returns embedding-similarity pairs only (faster, no worker needed).

Use `query` instead of `article_slug` for topic-based conflict search.

## Error Handling

| Failure | Action |
|---------|--------|
| research_fetch returns 0 articles | Different query, max 1 retry |
| Embedding server unreachable | Report to user, retry later |
| All queries return nothing | Tell user, delete state |

## Deep Work Awareness

When research runs inside a deep work session (you have a `deep_work.json` deadline):

- **Don't stop after your initial topic list is covered.** Explore adjacent areas, deeper subtopics, different angles on the same domain. The time budget is your guide, not the initial query list.
- **Batch your work:** fetch in rounds, then embed when done.
- **Check `get_deep_work_status` periodically** to gauge remaining time. In the last 30 minutes, shift to embedding whatever you've collected rather than fetching more.

## Compaction Recovery

Read `research-state.json`. Resume from `stage`. Missing file = done.

## Output Routing

Research → wiki only. Never MEMORY.md.
