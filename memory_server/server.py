from __future__ import annotations

import logging
import sqlite3
from pathlib import Path
from typing import Optional

from mcp.server.fastmcp import FastMCP

from config import MemoryConfig, load_config
from consolidator import consolidate
from embedding import EmbeddingProvider
from models import Category, MemoryEntry, SearchResult, Source, Trust
from sidecar import SidecarClient
from storage import (
    export_memories,
    forget,
    get_by_id,
    import_memories,
    init_db,
    mark_contradiction,
    prune,
    search_all,
    search_fts,
    search_hybrid,
    stats,
    store,
    tag,
)

logger = logging.getLogger(__name__)

_connections: dict[str, sqlite3.Connection] = {}


def _get_conn(config: MemoryConfig, scope: str = "project") -> sqlite3.Connection:
    if scope == "global":
        key = "global"
        db_path = config.global_db_path
    else:
        key = "project"
        db_path = config.project_db_path

    if key not in _connections:
        _connections[key] = init_db(db_path)
    return _connections[key]


def create_server(config: Optional[MemoryConfig] = None) -> FastMCP:
    if config is None:
        config = load_config()

    mcp = FastMCP("memory-server")

    # Instantiate embedding provider from config
    _embedding_provider = EmbeddingProvider(config.embedding)
    _sidecar = SidecarClient(config.sidecar)

    @mcp.tool()
    def memory_store(
        content: str,
        context: str = "",
        category: str = "fact",
        trust: str = "medium",
        source: str = "",
        source_session: str = "",
        tags: list[str] = [],
        scope: str = "project",
    ) -> dict:
        """Store a new memory. Returns the memory ID and whether it was created or reinforced (if duplicate detected)."""
        conn = _get_conn(config, scope)

        # Auto-embed: transparently generate embedding when provider is available
        embedding = _embedding_provider.embed(content)
        if embedding is None:
            logger.debug("Embedding unavailable for store — storing without embedding")

        result = store(
            conn,
            content,
            context=context or None,
            category=Category(category),
            trust=Trust(trust),
            source=Source(source) if source else None,
            source_session=source_session or None,
            tags=tags,
            embedding=embedding,
        )
        return result.model_dump()

    @mcp.tool()
    def memory_search(
        query: str,
        limit: int = 10,
        category: str = "",
        active_only: bool = True,
        scope: str = "project",
        verify: bool = False,
    ) -> list[dict]:
        """Search memories using hybrid FTS5 + vector search when available, FTS5-only otherwise.

        When verify=true, results are piped through the Qwen sidecar verifier
        and filtered to those judged relevant. On sidecar failure, results are
        returned unfiltered (verified=None) — fail-open.

        When scope="all", fans out to both project and global stores and merges
        via RRF (project entries preferred on equal score).
        """
        cat = Category(category) if category else None

        # Try to embed the query for hybrid search
        query_embedding = _embedding_provider.embed(query)

        if scope == "all":
            proj_conn = _get_conn(config, "project")
            glob_conn = _get_conn(config, "global")
            raw = search_all(
                proj_conn, glob_conn, query, query_embedding,
                limit=limit, category=cat, active_only=active_only,
            )
            results = [
                SearchResult(memory=entry, score=score, match_type=match_type)
                for entry, score, match_type in raw
            ]
        else:
            conn = _get_conn(config, scope)
            if query_embedding is not None:
                raw = search_hybrid(
                    conn, query, query_embedding, limit=limit, category=cat, active_only=active_only
                )
                results = [
                    SearchResult(memory=entry, score=score, match_type=match_type)
                    for entry, score, match_type in raw
                ]
            else:
                raw_fts = search_fts(conn, query, limit=limit, category=cat, active_only=active_only)
                results = [
                    SearchResult(memory=entry, score=score, match_type="fts5")
                    for entry, score in raw_fts
                ]

        if verify:
            results = _sidecar.verify_candidates(query, results)

        return [r.model_dump(mode="json") for r in results]

    @mcp.tool()
    def memory_verify(
        memory_ids: list[str],
        query: str,
        scope: str = "project",
    ) -> list[dict]:
        """Run the Qwen sidecar verifier over a set of memories for a given query.

        Returns each memory annotated with `verified=true|false|null`. On
        sidecar failure all entries come back with verified=null (fail-open).
        """
        conn = _get_conn(config, scope)
        candidates: list[SearchResult] = []
        for mem_id in memory_ids:
            entry = get_by_id(conn, mem_id)
            if entry is None:
                continue
            candidates.append(SearchResult(memory=entry, score=0.0, match_type="lookup"))

        if not candidates:
            return []

        verdict_map = _sidecar.verdicts(query, candidates)
        out: list[dict] = []
        for cand in candidates:
            verified = verdict_map.get(cand.memory.id)
            out.append(cand.model_copy(update={"verified": verified}).model_dump(mode="json"))
        return out

    @mcp.tool()
    def memory_contradict(
        memory_id_a: str,
        memory_id_b: str,
        scope: str = "project",
    ) -> dict:
        """Mark two memories as contradictory (bidirectional, advisory only).

        Both entries gain the other's id in their `contradicts` array. No
        trust demotion or deactivation — the caller decides what to do.
        """
        conn = _get_conn(config, scope)
        try:
            mark_contradiction(conn, memory_id_a, memory_id_b)
        except ValueError as e:
            return {"success": False, "error": str(e)}
        return {"success": True, "memory_id_a": memory_id_a, "memory_id_b": memory_id_b}

    @mcp.tool()
    def memory_forget(
        memory_id: str,
        superseded_by: str = "",
        scope: str = "project",
    ) -> dict:
        """Mark a memory as inactive (soft delete). Optionally link to a replacement memory."""
        conn = _get_conn(config, scope)
        success = forget(conn, memory_id, superseded_by=superseded_by or None)
        return {"success": success, "memory_id": memory_id}

    @mcp.tool()
    def memory_tag(
        memory_id: str,
        add: list[str] = [],
        remove: list[str] = [],
        scope: str = "project",
    ) -> dict:
        """Add or remove tags from a memory."""
        conn = _get_conn(config, scope)
        result = tag(conn, memory_id, add=add or None, remove=remove or None)
        if result is None:
            return {"success": False, "error": "Memory not found"}
        return {"success": True, "tags": result}

    @mcp.tool()
    def memory_stats(scope: str = "project") -> dict:
        """Get statistics about stored memories."""
        conn = _get_conn(config, scope)
        s = stats(conn)
        return s.model_dump(mode="json")

    @mcp.tool()
    def memory_export(
        scope: str = "project",
        category: str = "",
    ) -> str:
        """Export active memories to human-readable markdown. Optionally filter by category."""
        conn = _get_conn(config, scope)
        cat = Category(category) if category else None
        return export_memories(conn, category=cat)

    @mcp.tool()
    def memory_prune(
        dry_run: bool = True,
        scope: str = "project",
        max_age_days: int = 180,
        min_access_count: int = 2,
    ) -> dict:
        """Identify and optionally archive stale memories.

        Stale = active, trust='low', strength=1, AND (created_at older than
        max_age_days OR access_count < min_access_count). When dry_run=True
        (default), returns candidates without modification. When dry_run=False,
        sets active=0 on matching memories and returns the archived list.
        """
        conn = _get_conn(config, scope)
        candidates = prune(
            conn,
            dry_run=dry_run,
            max_age_days=max_age_days,
            min_access_count=min_access_count,
        )
        return {
            "dry_run": dry_run,
            "count": len(candidates),
            "candidates": candidates,
        }

    @mcp.tool()
    def memory_consolidate(
        dry_run: bool = True,
        scope: str = "project",
        min_cluster_size: int = 3,
        similarity_threshold: float = 0.80,
    ) -> dict:
        """Cluster semantically similar memories and merge each cluster via the Qwen sidecar.

        Single-link clustering on cosine similarity > similarity_threshold;
        clusters with fewer than min_cluster_size members are ignored. When
        dry_run=True (default), returns cluster info without modification.
        Fail-closed: if Qwen is unavailable for a cluster, that cluster is
        skipped entirely (clusters_skipped is incremented).
        """
        conn = _get_conn(config, scope)
        return consolidate(
            conn,
            config.sidecar,
            dry_run=dry_run,
            min_cluster_size=min_cluster_size,
            similarity_threshold=similarity_threshold,
        )

    @mcp.tool()
    def memory_import(
        markdown: str,
        mode: str = "merge",
        scope: str = "project",
    ) -> dict:
        """Import memories from markdown. mode='merge' adds new and reinforces duplicates. mode='replace' deactivates all existing then loads fresh."""
        conn = _get_conn(config, scope)
        return import_memories(conn, markdown, mode=mode)

    return mcp


# Module-level instance for `from server import mcp` (used by entry-point and import smoke tests).
# Tools are registered eagerly; tools open a DB connection lazily on first call.
mcp = create_server()
