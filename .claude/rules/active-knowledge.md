# Active Knowledge
## Phase: 40 - Memory Migration + Claim Dedup Guard

### Migration Schema + Mapping
from: memory_server/storage.py + migrate.py
retrieved: 2026-05-05

- memories table: id TEXT PK, content, context, category, trust, strength, source, source_session, tags, active, superseded_by, contradicts, embedding, created_at, updated_at, access_count
- Type-to-category: user→fact, feedback→correction, project→fact, reference→custom (from migrate.py, NOT invertible from CATEGORY_TO_TYPE)
- Trust: feedback→high, all others→medium
- Dedup: exact content match (SELECT 1 FROM memories WHERE content=$content AND active=1)
- IDs: crypto.randomUUID() on Node side (Python uses nanoid with mem_ prefix — different format is fine, no FK constraints)

### claim_dedup Current State
from: claim-tools.ts + Phase 38 approach review
retrieved: 2026-05-05

- db_allWithEmbeddings('claim') loads all rows + embeddings into memory, then O(n^2) cosine loop
- searchSimilar also does full-table scan — per-claim calls would be same complexity with worse constants
- Guard: COUNT query before load, cap at 1000 claims (~500K pairs, <2s on 768-dim vectors)
