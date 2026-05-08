---
name: wiki-curator
description: Synthesize curated wiki articles from raw source material.
  Topic-driven, not source-driven. Each article synthesizes multiple raw
  sources into comprehensive domain knowledge.
---

# Wiki Curation

You write curated wiki articles by synthesizing raw source material into
comprehensive, topic-driven knowledge articles with inline citations.

## Critical Constraint

**The unit of work is a TOPIC, never a raw source.**

Each curated article synthesizes content from multiple raw sources around
a single topic. If you find yourself writing one article per raw source,
STOP — that's paraphrasing, not synthesis.

Targets per wiki:
- ~150-200 curated articles regardless of raw source count
- Each article cites 3-30 raw sources
- Synthesis ratio: ~15-20 raw sources per curated article

## Trigger Patterns

- "Let's curate the [wiki-name] wiki"
- "Write articles from the raw sources"
- "What topics need coverage?"
- "Continue curating" / "next batch"
- Any instruction to process raw sources into curated articles

## Workflow

### Step 1: Taxonomy Planning (REQUIRED — never skip)

Before writing ANY article:

1. Read the wiki's schema.md for hierarchy roots, categories, and tags
2. Run `wiki_stats` to see current coverage (raw count vs curated count)
3. Run `knowledge_search` with 5-10 broad topic queries to understand what
   raw material exists and how it clusters
4. Propose a topic plan to the user:
   - Organized by category/hierarchy root
   - ~10-20 topic areas, each yielding 5-15 articles
   - Estimated total article count (~150-200)
   - Example: "Technical Analysis (15 articles): candlestick patterns,
     chart patterns, indicators, volume analysis, trend analysis..."
5. **WAIT for user approval before proceeding**

If the user says "just go through everything" or "process all raws":
- Do NOT interpret this as one-article-per-source
- Say: "I'll organize the raw sources by topic and synthesize across
  them. Here's my proposed plan..." then present the taxonomy

### Step 2: Write Articles in Batches

For each approved topic area:

1. **Search**: `knowledge_search(topic_keywords, top_k=30)` to find all
   relevant raw sentences across the corpus
2. **Group**: Identify which raw slugs contribute to this topic (aim for
   10-30 sources per article)
3. **Read**: `wiki_read` the 3-5 most relevant raw sources for full context.
   Use search results for the rest — don't read every raw source.
4. **Write**: `wiki_write` the curated article with:
   - Title reflecting the TOPIC (not any single source)
   - Inline `[source-slug]` citations after factual claims
   - `sources: [slug1, slug2, ...]` in frontmatter (minimum 3)
   - `status: draft` in frontmatter
   - Cross-links to related curated articles using `[[Article Title]]`
5. **Report**: After EACH article, send a progress message (see below)
6. **Batch**: Write 5-8 articles per topic area, then pause for check-in

### Step 3: Coverage Check (after each batch)

1. Run `wiki_stats` to show progress
2. Report: "Batch complete: [N] articles on [topic area]. Total: [X]/[target]."
3. Identify remaining gaps
4. Ask: "Continue with [next topic area], or want to review what I've written?"

### Step 4: Cross-linking Pass (after all batches)

After all topic areas are covered:
1. Review all curated articles for cross-link opportunities
2. Add `[[Related Article]]` links where topics connect
3. Report final stats

## Progress Reporting (MANDATORY)

**After EVERY article written**, send a brief message:
  "23/150: Wildlife Trade Money Laundering (7 sources)"

**After EVERY batch of 5-8 articles**, pause and check in:
  "Batch complete: 8 articles on Financial Crime Typologies.
   Progress: 23/150 articles, 15% of plan.
   Next: Sanctions Evasion (6 articles planned).
   Continue, or review first?"

**NEVER write more than 8 articles without a check-in.**
**NEVER go silent for more than 5 minutes without a status update.**

If you're about to hit a context limit, say so BEFORE it happens:
  "Getting close to context limit — let me save progress and we can
   continue in a fresh session."

## State Tracking

Maintain a curation state file at `<wiki_path>/curation-state.json`:

```json
{
  "wiki": "trading-wiki",
  "taxonomy_approved": true,
  "topic_plan": [
    {"area": "Technical Analysis", "planned": 15, "completed": 8},
    {"area": "Risk Management", "planned": 12, "completed": 0}
  ],
  "articles_written": 8,
  "articles_target": 150,
  "last_batch": "Technical Analysis (8 articles)",
  "updated_at": "2026-05-08T14:30:00Z"
}
```

Update this file after each batch. Read it at session start to resume
where you left off. This file survives compaction and /clear.

## Guards

- NEVER write an article citing fewer than 3 raw sources
- NEVER iterate through raw slugs sequentially
- ALWAYS plan by topic taxonomy before writing
- ALWAYS wait for user approval on the topic plan
- ALWAYS send progress messages between articles
- If articles_written exceeds articles_target by 20%, stop and reassess
