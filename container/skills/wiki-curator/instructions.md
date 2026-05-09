Wiki curation rules:

- The unit of work is a topic, not a raw source. Each article synthesizes
  multiple raw sources.
- Always start with source landscape sampling, then taxonomy planning.
  Never skip to writing.
- Progress messages are mandatory — never go silent during batch work.
- Use knowledge_search to find relevant raw material, not sequential
  wiki_read through raw slugs.
- Maintain curation-state.json for session continuity (see schema below).
- Target ~150-200 curated articles per wiki regardless of raw source count.
- Two-round execution: Round 1 for broad coverage (~60-70% of target),
  gap analysis, then Round 2 for precision coverage (~30-40%).
- Per-category coverage gate: do NOT move to next category until >80%
  coverage verified via knowledge_search spot checks.
- Min-sources relaxed: 3+ recommended, 1-2 acceptable for niche topics
  (add "Coverage based on limited source material" note), 0 still NEVER.
- The knowledge-wiki skill suite (github.com/j-wanger/knowledge-wiki)
  has proven patterns for this: wiki-bootstrap's taxonomy-first planning,
  A->W->R quality pipeline, and batch-with-checkpoints approach. Refer to
  it for structural guidance when designing topic plans.

## curation-state.json Schema

Maintain this file at `<wiki_path>/curation-state.json`. Update after
each batch. Read at session start to resume.

```json
{
  "wiki": "trading-wiki",
  "round": 1,
  "cluster_analysis_done": true,
  "taxonomy_approved": true,
  "coverage_by_category": {
    "Technical Analysis": 0.92,
    "Risk Management": 0.45,
    "Options Trading": 0.0
  },
  "gaps_identified": [
    "No coverage of credit derivatives",
    "Shallow coverage of market regime detection"
  ],
  "source_quality": {
    "high": 340,
    "medium": 1200,
    "low": 870
  },
  "topic_plan": [
    {"area": "Technical Analysis", "planned": 15, "completed": 14},
    {"area": "Risk Management", "planned": 12, "completed": 5}
  ],
  "articles_written": 19,
  "articles_target": 150,
  "last_batch": "Risk Management (5 articles)",
  "updated_at": "2026-05-09T14:30:00Z"
}
```

Fields:
- `round`: Current execution round (1 = broad coverage, 2 = precision/gap-fill)
- `cluster_analysis_done`: Whether Step 0 source landscape sampling completed
- `taxonomy_approved`: Whether user approved the topic plan
- `coverage_by_category`: Map of category name to coverage fraction (0.0-1.0),
  updated after per-category coverage verification
- `gaps_identified`: List of gaps found during between-round gap analysis
- `source_quality`: Rough counts of high/medium/low quality raw sources
  encountered during searches
- `topic_plan`: Per-area planned vs completed article counts
- `articles_written`, `articles_target`: Overall progress
- `last_batch`: Description of most recent batch for session recovery
