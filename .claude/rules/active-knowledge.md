# Active Knowledge — Phase 26

### Chunking & Embedding Strategies
from: [[wiki:chunking-and-embedding-strategies]]
retrieved: 2026-05-01

- Chunking method impacts retrieval accuracy more than embedding model choice
- Contextual Retrieval (Anthropic): prepend 50-100 tokens context per chunk — 67% failure-rate reduction
- nomic-embed-text-v1.5: 768 dims, ~67 MTEB, 768-dim is the sweet spot for production RAG

### Vector Store Design
from: [[wiki:wiki-knowledge-graph-architectures]]
retrieved: 2026-05-01

- Two-layer hybrid: structural layer (SQLite-backed) + semantic layer (768-dim embeddings)
- At 295K rows, brute-force cosine sim needs chunked loading (10K/batch) to manage memory
- Content hashing for incremental re-embedding — only re-embed changed articles

### Existing Claim Infrastructure
from: [[decision:phase-22-vector-claim-store-approach]]
retrieved: 2026-05-01

- ClaimVectorStore: SQLite + brute-force cosine, embedBatch for bulk embedding
- claim-embeddings.ts: embedText/embedBatch via local llama-server port 8081
- claim-embed-pipeline.ts: stateful batch processing with embed-state.json
