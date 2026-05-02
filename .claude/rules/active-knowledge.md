# Active Knowledge — Phase 27

### RAG Contradiction Detection
from: [[wiki:rag-evaluation-and-quality-metrics]]
retrieved: 2026-05-01

- Cross-document contradiction is a known RAG failure mode — contradictory retrieved info presented without acknowledgment
- No eval framework can distinguish factually incorrect contexts from correct ones — requires separate context-layer monitoring
- High faithfulness scores possible with stale/inaccurate content — similarity alone is not sufficient

### Graph vs Vector at Current Scale
from: [[wiki:wiki-knowledge-graph-architectures]]
retrieved: 2026-05-01

- Under ~50 articles active per query, flat-file + vector is simpler and sufficient
- Graph approaches show value only for multi-hop reasoning (2-3x accuracy gains)
- KiroGraph two-layer: structural (SQLite) + semantic (768-dim embeddings) — matches our architecture

### Existing Knowledge Infrastructure
from: [[decision:phase-26-sentence-embedding-store-approach]]
retrieved: 2026-05-01

- Unified knowledge.db: type='claim'|'sentence', chunked search 10K/batch, contextual [title|section] prefix
- ~295K sentences + ~9K claims per wiki, ~900MB total embeddings
- Chunked search keeps memory under ~30MB per query
