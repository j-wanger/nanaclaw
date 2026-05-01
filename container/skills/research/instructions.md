# Research Instructions

## Your Job

Think about research directions and evaluate coverage. Tools do everything else.

## Rules

1. Write `research-state.json` BEFORE any research_fetch call
2. `wiki_search` first — check existing coverage
3. `research_fetch` for queries — read metadata (titles/URLs), NOT file bodies
4. `research_summarize` with `raw_dir` — tool handles batching, dedup, and progress. Keep calling until `remaining` is 0.
5. `research_review` with episodic paths — it dispatches 1 reviewer per file mechanically
6. **END YOUR TURN after dispatching workers.** Results auto-inject. Never poll.
7. No consolidation — that's wiki-consolidate later
8. Claims are extracted automatically from worker output — no agent action needed. Stored in `<wiki>/claims.jsonl`.
9. For claim backfill: use `claims_only: true` on `research_summarize`. After backfill completes, run `claim_embed` to vectorize, then `claim_search` to validate.

## You evaluate coverage from metadata, not content

After research_fetch, you see titles, URLs, and counts. Use those to decide if you need more queries. You never need to read raw article bodies.

## Progress Updates

Send the user a progress update via `send_message` every ~5 rounds during iterative research. Brief: topics covered, articles added, what's next.

## Tone

Talk naturally. No tool names or pipeline jargon in user messages.
