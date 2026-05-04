"""Memory consolidator.

Clusters semantically similar memories via single-link cosine clustering and
merges each cluster into one entry through a Qwen sidecar call. Fail-closed:
if Qwen is unavailable or returns nothing parseable for a cluster, that
cluster is skipped entirely — never concatenated or partially merged.
"""

from __future__ import annotations

import logging
import sqlite3
import struct
import sys
from pathlib import Path
from typing import Optional

import httpx

# Allow `python -m memory_server.consolidator` and direct script use.
sys.path.insert(0, str(Path(__file__).parent))

from config import SidecarConfig
from models import Category, MemoryEntry, Source, Trust
from storage import (
    _cosine_similarity,
    _row_to_entry,
    forget,
    store,
)

logger = logging.getLogger(__name__)


CONSOLIDATE_PROMPT_TEMPLATE = """You are consolidating related memories into a single entry.

Original memories:
{memories}

Write a single consolidated memory that captures all key facts from the originals.
Be concise. Preserve specific details, dates, and names. Output ONLY the consolidated text."""


def find_clusters(
    conn: sqlite3.Connection,
    *,
    min_cluster_size: int = 3,
    similarity_threshold: float = 0.80,
) -> list[list[MemoryEntry]]:
    """Group active memories with embeddings via single-link cosine clustering.

    Two memories belong to the same cluster when either is similar
    (cosine > similarity_threshold) to any member of the other's cluster.
    Only clusters with at least min_cluster_size members are returned.
    """
    rows = conn.execute(
        "SELECT * FROM memories WHERE active = 1 AND embedding IS NOT NULL"
    ).fetchall()

    entries: list[MemoryEntry] = []
    embeddings: list[list[float]] = []
    for row in rows:
        blob = row["embedding"]
        if not blob:
            continue
        emb = list(struct.unpack(f"<{len(blob) // 4}f", blob))
        entries.append(_row_to_entry(row))
        embeddings.append(emb)

    n = len(entries)
    if n < min_cluster_size:
        return []

    parent = list(range(n))

    def find(i: int) -> int:
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    def union(i: int, j: int) -> None:
        ri, rj = find(i), find(j)
        if ri != rj:
            parent[ri] = rj

    for i in range(n):
        for j in range(i + 1, n):
            sim = _cosine_similarity(embeddings[i], embeddings[j])
            if sim > similarity_threshold:
                union(i, j)

    grouped: dict[int, list[MemoryEntry]] = {}
    for i in range(n):
        root = find(i)
        grouped.setdefault(root, []).append(entries[i])

    return [members for members in grouped.values() if len(members) >= min_cluster_size]


def consolidate(
    conn: sqlite3.Connection,
    sidecar_config: SidecarConfig,
    *,
    dry_run: bool = True,
    min_cluster_size: int = 3,
    similarity_threshold: float = 0.80,
) -> dict:
    """Find clusters and merge each via the Qwen sidecar.

    For each cluster we call Qwen for a merged summary. If Qwen fails for a
    cluster, that cluster is skipped — no degraded output is written. On
    success a new entry is stored with source=CONSOLIDATED and trust=low,
    tagged 'consolidated' and 'source-ids:<id1>,<id2>,...', and every
    original is superseded by it.

    dry_run=True returns cluster info without calling Qwen or modifying the DB.
    """
    clusters = find_clusters(
        conn,
        min_cluster_size=min_cluster_size,
        similarity_threshold=similarity_threshold,
    )

    summary: dict = {
        "clusters_found": len(clusters),
        "clusters_merged": 0,
        "clusters_skipped": 0,
        "memories_superseded": 0,
    }

    if dry_run:
        summary["clusters"] = [
            [{"id": m.id, "content": m.content} for m in cluster]
            for cluster in clusters
        ]
        return summary

    for cluster in clusters:
        merged_text = _call_qwen(cluster, sidecar_config)
        if not merged_text:
            summary["clusters_skipped"] += 1
            continue

        source_ids = ",".join(m.id for m in cluster)
        tags = ["consolidated", f"source-ids:{source_ids}"]

        result = store(
            conn,
            merged_text,
            context=f"Consolidated from {len(cluster)} memories",
            category=Category.FACT,
            trust=Trust.LOW,
            source=Source.CONSOLIDATED,
            tags=tags,
        )
        new_id = result.id

        for m in cluster:
            if forget(conn, m.id, superseded_by=new_id):
                summary["memories_superseded"] += 1

        summary["clusters_merged"] += 1

    return summary


def _call_qwen(cluster: list[MemoryEntry], config: SidecarConfig) -> Optional[str]:
    """Call Qwen with the cluster contents, return merged text or None on any failure."""
    if not config.enabled:
        return None

    numbered = "\n".join(f"{i + 1}. {m.content}" for i, m in enumerate(cluster))
    prompt = CONSOLIDATE_PROMPT_TEMPLATE.format(memories=numbered)

    try:
        response = httpx.post(
            config.endpoint,
            json={
                "model": config.model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.0,
            },
            timeout=config.timeout_ms / 1000.0,
        )
    except (httpx.ConnectError, httpx.TimeoutException, httpx.HTTPError) as e:
        logger.warning(f"Consolidator Qwen unavailable: {e}")
        return None
    except Exception as e:
        logger.warning(f"Consolidator Qwen call failed: {e}")
        return None

    if response.status_code != 200:
        logger.warning(f"Consolidator sidecar returned {response.status_code}")
        return None

    try:
        content = response.json()["choices"][0]["message"]["content"]
    except (KeyError, IndexError, ValueError, TypeError) as e:
        logger.warning(f"Consolidator response shape malformed: {e}")
        return None

    if not isinstance(content, str) or not content.strip():
        return None
    return content.strip()
