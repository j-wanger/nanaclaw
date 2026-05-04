"""Tests for memory consolidation: clustering + Qwen-merged entry creation."""

from __future__ import annotations

import math
import struct
import sys
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import MagicMock

import pytest
from nanoid import generate as nanoid

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import SidecarConfig
from consolidator import consolidate, find_clusters
from models import Source
from storage import init_db


EMBED_DIM = 768


def _pad(prefix: list[float]) -> list[float]:
    """Pad a small prefix vector out to EMBED_DIM, zero-filled."""
    return list(prefix) + [0.0] * (EMBED_DIM - len(prefix))


def _insert(conn, content: str, embedding: list[float]) -> str:
    """Insert a memory directly with a precomputed embedding, bypassing dedup."""
    blob = struct.pack(f"<{len(embedding)}f", *embedding)
    mem_id = f"mem_{nanoid(size=12)}"
    now = datetime.now(timezone.utc).isoformat()
    conn.execute(
        """INSERT INTO memories
           (id, content, context, category, trust, strength, source,
            source_session, tags, active, superseded_by, contradicts,
            embedding, created_at, updated_at, access_count)
           VALUES (?, ?, NULL, 'fact', 'medium', 1, NULL, NULL, '[]', 1,
                   NULL, '[]', ?, ?, ?, 0)""",
        (mem_id, content, blob, now, now),
    )
    rowid = conn.execute(
        "SELECT rowid FROM memories WHERE id = ?", (mem_id,)
    ).fetchone()["rowid"]
    # Mirror into the vec table when the extension is loaded; ignore otherwise.
    try:
        conn.execute(
            "INSERT INTO memories_vec (rowid, embedding) VALUES (?, ?)",
            (rowid, blob),
        )
    except Exception:
        pass
    conn.commit()
    return mem_id


def _mock_qwen_response(content: str) -> MagicMock:
    resp = MagicMock()
    resp.status_code = 200
    resp.json.return_value = {"choices": [{"message": {"content": content}}]}
    return resp


@pytest.fixture
def db(tmp_path):
    conn = init_db(tmp_path / "memory.db")
    yield conn
    conn.close()


@pytest.fixture
def sidecar_cfg():
    return SidecarConfig(
        enabled=True,
        endpoint="http://localhost:8080/v1/chat/completions",
        model="qwen",
        timeout_ms=3000,
    )


# Three close-cosine vectors (pairwise > 0.80) plus one orthogonal one.
EMB_A = _pad([1.0, 0.0])
EMB_B = _pad([0.95, math.sqrt(1 - 0.95 ** 2)])  # cos(A,B) = 0.95
EMB_C = _pad([0.85, math.sqrt(1 - 0.85 ** 2)])  # cos(A,C) = 0.85, cos(B,C) ~0.97
EMB_D = _pad([0.0, 0.0, 1.0])                    # orthogonal


class TestFindClusters:
    def test_groups_similar(self, db):
        a = _insert(db, "alpha fact", EMB_A)
        b = _insert(db, "beta fact", EMB_B)
        c = _insert(db, "gamma fact", EMB_C)
        _insert(db, "delta fact", EMB_D)

        clusters = find_clusters(db)

        assert len(clusters) == 1
        ids = {m.id for m in clusters[0]}
        assert ids == {a, b, c}

    def test_min_size_excludes_pairs(self, db):
        _insert(db, "alpha fact", EMB_A)
        _insert(db, "beta fact", EMB_B)

        clusters = find_clusters(db)  # default min_cluster_size=3

        assert clusters == []

    def test_ignores_inactive_and_no_embedding(self, db):
        # Three similar, but one is inactive
        a = _insert(db, "alpha", EMB_A)
        b = _insert(db, "beta", EMB_B)
        _insert(db, "gamma", EMB_C)
        db.execute("UPDATE memories SET active = 0 WHERE id = ?", (a,))
        db.commit()

        clusters = find_clusters(db)
        # Only two active similar memories — below min size
        assert clusters == []


class TestConsolidate:
    def test_merges_cluster_with_qwen(self, db, sidecar_cfg, monkeypatch):
        a = _insert(db, "alpha fact", EMB_A)
        b = _insert(db, "beta fact", EMB_B)
        c = _insert(db, "gamma fact", EMB_C)

        merged_text = "Alpha-beta-gamma consolidated."
        monkeypatch.setattr(
            "consolidator.httpx.post",
            MagicMock(return_value=_mock_qwen_response(merged_text)),
        )

        summary = consolidate(db, sidecar_cfg, dry_run=False)

        assert summary["clusters_found"] == 1
        assert summary["clusters_merged"] == 1
        assert summary["clusters_skipped"] == 0
        assert summary["memories_superseded"] == 3

        # The new consolidated entry exists with source=consolidated.
        row = db.execute(
            "SELECT id, content, source, tags FROM memories "
            "WHERE source = ? AND active = 1",
            (Source.CONSOLIDATED.value,),
        ).fetchone()
        assert row is not None
        assert row["content"] == merged_text
        new_id = row["id"]
        assert "consolidated" in row["tags"]
        assert "source-ids:" in row["tags"]

        # Originals are inactive and superseded by the new entry.
        for original_id in (a, b, c):
            r = db.execute(
                "SELECT active, superseded_by FROM memories WHERE id = ?",
                (original_id,),
            ).fetchone()
            assert r["active"] == 0
            assert r["superseded_by"] == new_id

    def test_qwen_unavailable_skips_cluster(self, db, sidecar_cfg, monkeypatch):
        import httpx as httpx_module

        a = _insert(db, "alpha fact", EMB_A)
        b = _insert(db, "beta fact", EMB_B)
        c = _insert(db, "gamma fact", EMB_C)

        def _refused(*args, **kwargs):
            raise httpx_module.ConnectError("connection refused")

        monkeypatch.setattr("consolidator.httpx.post", _refused)

        summary = consolidate(db, sidecar_cfg, dry_run=False)

        assert summary["clusters_found"] == 1
        assert summary["clusters_merged"] == 0
        assert summary["clusters_skipped"] == 1
        assert summary["memories_superseded"] == 0

        # No consolidated entry was created.
        consolidated_count = db.execute(
            "SELECT COUNT(*) FROM memories WHERE source = ?",
            (Source.CONSOLIDATED.value,),
        ).fetchone()[0]
        assert consolidated_count == 0

        # Originals are unchanged: still active, no superseded_by.
        for original_id in (a, b, c):
            r = db.execute(
                "SELECT active, superseded_by FROM memories WHERE id = ?",
                (original_id,),
            ).fetchone()
            assert r["active"] == 1
            assert r["superseded_by"] is None

    def test_dry_run_returns_clusters_without_changes(self, db, sidecar_cfg, monkeypatch):
        a = _insert(db, "alpha fact", EMB_A)
        b = _insert(db, "beta fact", EMB_B)
        c = _insert(db, "gamma fact", EMB_C)

        post_mock = MagicMock()
        monkeypatch.setattr("consolidator.httpx.post", post_mock)

        summary = consolidate(db, sidecar_cfg, dry_run=True)

        assert summary["clusters_found"] == 1
        assert summary["clusters_merged"] == 0
        assert summary["clusters_skipped"] == 0
        assert summary["memories_superseded"] == 0
        assert "clusters" in summary
        assert len(summary["clusters"]) == 1
        cluster_ids = {m["id"] for m in summary["clusters"][0]}
        assert cluster_ids == {a, b, c}

        # Qwen was never called.
        post_mock.assert_not_called()

        # No consolidated entry; originals untouched.
        consolidated_count = db.execute(
            "SELECT COUNT(*) FROM memories WHERE source = ?",
            (Source.CONSOLIDATED.value,),
        ).fetchone()[0]
        assert consolidated_count == 0
        for original_id in (a, b, c):
            r = db.execute(
                "SELECT active, superseded_by FROM memories WHERE id = ?",
                (original_id,),
            ).fetchone()
            assert r["active"] == 1
            assert r["superseded_by"] is None
