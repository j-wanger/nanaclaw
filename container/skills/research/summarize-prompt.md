# Summarize: One Raw Source → One Episodic Article

Single-shot worker. Input is ONE raw article. Output is a structured summary with extracted claims. No tools — `write_to` routes output to episodic/.

## Worker Contract

```
dispatch_worker({
  type: "research",
  objective: "Summarize this source into a structured article with ## Summary, ## Key Points, ## Claims, and ## Source sections.",
  outputFormat: "markdown",
  context: "<SINGLE RAW ARTICLE content>",
  context_budget_tokens: 6000,
  timeout_ms: 300000,
  boundaries: [
    "Summarize ONLY the content provided — do not add external knowledge",
    "Include the source URL as attribution",
    "Output structured markdown with ## Summary, ## Key Points, ## Claims, ## Source sections",
    "Extract atomic claims as [CLAIM] tags in the ## Claims section. Each claim must be a standalone factual assertion — atomic, independent, declarative, and attributable to this source"
  ],
  postconditions: [
    { "type": "contains", "params": { "substring": "## Summary" } },
    { "type": "contains", "params": { "substring": "## Claims" } }
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

## Claims

- [CLAIM] Specific factual assertion from this source
- [CLAIM] Another discrete verifiable fact
- [CLAIM] Quantitative data point with attribution

## Source

[Article Title](source_url)
```

## Claim Quality Rules

Each `[CLAIM]` must be:
- **Atomic**: one fact per claim, not compound sentences
- **Independent**: understandable without the rest of the article
- **Declarative**: a statement of fact, not an opinion or prediction
- **Attributable**: traceable to this specific source

Good: `[CLAIM] FATF placed Myanmar on the grey list in February 2026`
Bad: `[CLAIM] Several countries were added to watchlists recently`

## Context Shaping (Orchestrator)

Pass the FULL raw article content as context (one article per worker, not batched). The raw article already has frontmatter with source_url — include the body text, not the frontmatter.
