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

### Step 0: Source Landscape Sampling (REQUIRED — before taxonomy)

Before designing the taxonomy, map what's actually in the corpus:

1. Run `knowledge_search` with 15-20 broad queries spanning the wiki's
   domain to sample what raw material exists
2. Identify natural topic groupings from returned slugs and content areas
3. Note large groupings (suggest multiple articles) and small ones
   (suggest merging into broader topics)
4. Present the landscape analysis to the user BEFORE proposing taxonomy:
   - "Here's what I found in the corpus: [groupings with rough sizes]"
   - "Large clusters: [X], [Y] — these probably need 5-10 articles each"
   - "Small/niche areas: [A], [B] — could merge or get 1 article each"
5. Be honest: this is broad sampling, not statistical clustering. It
   reveals the shape of the corpus but may miss niche topics.

Use the landscape analysis as the STARTING POINT for taxonomy design in
Step 1.

### Step 1: Taxonomy Planning (REQUIRED — never skip)

Before writing ANY article:

1. Read the wiki's schema.md for hierarchy roots, categories, and tags
2. Run `wiki_stats` to see current coverage (raw count vs curated count)
3. Run `knowledge_search` with 5-10 targeted queries to fill gaps from
   the landscape sampling
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

### Source Quality Heuristics

When gathering raw material for an article, prioritize by quality:

- **High quality**: Longer articles (>500 words), multiple sections,
  authoritative domains, already cited by other curated articles,
  contains specific data/numbers/regulatory references
- **Low quality**: Very short (<200 words), no structure, opinion
  without citations, duplicative of other sources
- Start with 3-5 highest-quality sources as backbone; use lower-quality
  sources only to fill gaps
- If a topic has only low-quality sources, note it explicitly in the
  article: "Coverage based on limited source material."

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

### Step 3: Per-Category Coverage Verification (after each category)

After completing ALL articles in a category:

1. Run `knowledge_search` with 5-10 queries targeting that category's
   key concepts
2. Compare results: do they mostly return curated articles (good coverage)
   or raw sources not yet synthesized (gap)?
3. For each uncovered cluster: genuine gap → write 1-3 more articles;
   low-value → skip with a note
4. Report coverage percentage to user: "Category X: ~85% coverage,
   2 minor gaps identified"
5. **Do NOT proceed to the next category until coverage >80%.**
   Compounding gaps across categories is how remediation backlogs form.

Run `wiki_stats` to show overall progress:
  "Batch complete: [N] articles on [topic area]. Total: [X]/[target]."
Ask: "Continue with [next topic area], or want to review what I've written?"

### Two-Round Execution Model

Execution proceeds in two rounds, not a single linear pass:

**Round 1 — Broad Coverage (~60-70% of target articles):**
One article per major topic. Prioritize breadth over depth. Every major
topic in the taxonomy gets at least one article before any topic gets a
second. Follow Steps 2-3 per category.

**Gap Analysis (between rounds):**
After Round 1 completes, run a semantic coverage check across ALL
categories:
- Identify zero-coverage topics that were missed
- Identify shallow coverage (topic exists but key subtopics missing)
- Find unconsumed raw source clusters via broad `knowledge_search`
- Look for cross-topic synthesis opportunities (themes spanning
  multiple categories)
- Present gap analysis to user before starting Round 2

**Round 2 — Precision Coverage (~30-40% of target articles):**
Targeted articles filling gaps from the analysis:
- Deep-dives into topics that got only surface coverage in Round 1
- Cross-cutting synthesis articles that connect themes across categories
- Gap-fill articles for missed topics
- Follow Steps 2-3 per article, with per-category coverage re-check

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

Maintain a curation state file at `<wiki_path>/curation-state.json`.
See `instructions.md` for the full schema. Key fields:

- `round` (1 or 2), `cluster_analysis_done`, `taxonomy_approved`
- `coverage_by_category` — map of category name to coverage fraction
- `gaps_identified` — list from between-round gap analysis
- `source_quality` — rough counts: high/medium/low
- `topic_plan`, `articles_written`, `articles_target`, `last_batch`

Update after each batch. Read at session start to resume where you left
off. This file survives compaction and /clear.

## Guards

- Minimum sources per article:
  - 3+ sources: recommended (standard articles)
  - 1-2 sources: acceptable for niche topics with limited corpus coverage.
    Add a note: "Coverage based on limited source material."
  - 0 sources: NEVER — every article must cite at least one raw source
- NEVER iterate through raw slugs sequentially
- ALWAYS plan by topic taxonomy before writing
- ALWAYS wait for user approval on the topic plan
- ALWAYS send progress messages between articles
- If articles_written exceeds articles_target by 20%, stop and reassess
