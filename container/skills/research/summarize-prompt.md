# Summarize: One Raw Source → One Episodic Article

Single-shot worker. Input is ONE raw article. Output is a structured summary. No tools — `write_to` routes output to episodic/.

## Worker Contract

```
dispatch_worker({
  type: "research",
  objective: "Summarize this source into a structured article.",
  outputFormat: "markdown",
  context: "<SINGLE RAW ARTICLE content>",
  context_budget_tokens: 6000,
  timeout_ms: 300000,
  boundaries: [
    "Summarize ONLY the content provided — do not add external knowledge",
    "Include the source URL as attribution",
    "Output structured markdown with ## Summary, ## Key Points, ## Source sections"
  ],
  postconditions: [
    { "type": "contains", "params": { "substring": "## Summary" } }
  ],
  write_to: {
    wiki: "<target_wiki>",
    tier: "episodic",
    title: "<descriptive title from article content>",
    tags: [<relevant tags>]
  }
})
```

## Expected Output

```markdown
## Summary

One paragraph capturing the core finding or announcement.

## Key Points

- Point 1
- Point 2
- Point 3

## Source

[Article Title](source_url)
```

## Context Shaping (Orchestrator)

Pass the FULL raw article content as context (one article per worker, not batched). The raw article already has frontmatter with source_url — include the body text, not the frontmatter.
