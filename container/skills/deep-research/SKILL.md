# Deep Research

Multi-step web research producing structured knowledge wiki entries. Combines web_search, web_extract, local worker dispatch, and wiki_write into an autonomous research workflow.

## When to Use

- User asks to research a topic in depth
- User says "look into", "find out about", "research", "investigate"
- Scheduled research tasks (Phase 6 autonomous loops)
- Any task requiring web-sourced knowledge synthesis

## Research Workflow

### Step 1: Search (2-3 queries)

Use `web_search` with varied query phrasings to get diverse results. Aim for 2+ distinct domains.

```
web_search(query: "topic main query")
web_search(query: "topic alternative framing OR related concept")
```

Review snippets. Pick 3-5 URLs with the most relevant content.

### Step 2: Extract (selected URLs)

Use `web_extract` on each chosen URL. The tool returns clean markdown stripped of navigation and ads.

```
web_extract(url: "https://...", max_chars: 20000)
```

Skim extracted content. Discard low-quality or duplicate sources.

### Step 3: Synthesize (dispatch to worker or self)

**For factual synthesis (summaries, comparisons, timelines):** Dispatch to local worker with extracted content as context.

```
dispatch_worker(
  type: "research",
  objective: "Synthesize findings on <topic>. Structure: ## Key Findings, ## Comparison, ## Open Questions",
  outputFormat: "markdown",
  context: "<concatenated extracted content from Step 2>",
  context_budget_tokens: 6000,
  timeout_ms: 120000,
  postconditions: [
    { type: "contains", params: { substring: "## Key Findings" } },
    { type: "line-count", params: { min: "10", max: "200" } }
  ]
)
```

**For analytical synthesis (recommendations, evaluations, decisions):** Do it yourself — worker lacks the judgment for opinionated analysis.

### Step 4: Write to Wiki

Use `wiki_write` to route the output to the appropriate knowledge wiki. The tool auto-routes by topic keywords, or you can specify explicitly.

```
wiki_write(
  title: "Descriptive Article Title",
  content: "<synthesis from Step 3>",
  tags: ["topic-tag-1", "topic-tag-2"],
  topic: "description for wiki routing"
)
```

For explicit routing: `wiki_write(..., wiki_name: "aml-wiki")`.

## Structured Output Format

Research output should follow this structure:

```markdown
## Key Findings

- Finding 1 with source citation
- Finding 2 with source citation

## Sources

| # | Title | URL | Relevance |
|---|-------|-----|-----------|
| 1 | Source title | URL | Why included |

## Open Questions

- Unresolved questions for follow-up research
```

## Source Citation

Always cite sources. Include URL and title for each claim. When dispatching to workers, instruct them to preserve source attributions from the context.

## Compaction Recovery

If context compacts mid-research:
1. Check workspace for any partial research files
2. Use `web_search` to re-find sources if needed
3. Continue from the last completed step — don't restart

## What NOT to Do

- Don't extract every search result — pick the 3-5 best
- Don't pass more than 6000 tokens of context to a worker (Qwen's sweet spot is 4K-8K)
- Don't write to wiki without at least 2 distinct sources
- Don't dispatch analytical/evaluative tasks to workers — they lack judgment for opinions
