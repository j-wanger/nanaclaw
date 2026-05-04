"""Tests for MCP server tool wiring, including sidecar verify integration."""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import MagicMock

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import EmbeddingConfig, MemoryConfig, SidecarConfig
from models import Category, MemoryEntry, SearchResult, Trust
import server as server_module


def _get_tool(mcp, name):
    return mcp._tool_manager._tools[name].fn


@pytest.fixture(autouse=True)
def _reset_connections():
    server_module._connections.clear()
    yield
    server_module._connections.clear()


@pytest.fixture
def config(tmp_path):
    return MemoryConfig(
        project_dir=str(tmp_path),
        global_dir=str(tmp_path / "global"),
        embedding=EmbeddingConfig(mode="local"),
        sidecar=SidecarConfig(enabled=True),
    )


def _seed_memories(mcp):
    store = _get_tool(mcp, "memory_store")
    ids = []
    for content in [
        "Alice prefers Rust for systems work",
        "The dev wiki uses .dev-wiki/ for phases",
        "Memory MCP uses SQLite as primary store",
        "Terse responses preferred — no preamble",
    ]:
        result = store(content=content, category="fact", trust="medium")
        ids.append(result["id"])
    return ids


def _mock_qwen_response(verdicts: list[str]) -> MagicMock:
    body = "\n".join(verdicts)
    resp = MagicMock()
    resp.status_code = 200
    resp.json.return_value = {"choices": [{"message": {"content": body}}]}
    return resp


class TestMemoryVerify:
    def test_verify_tool_returns_verdicts(self, config, monkeypatch):
        mcp = server_module.create_server(config)
        ids = _seed_memories(mcp)

        post_mock = MagicMock(return_value=_mock_qwen_response([
            "1. relevant",
            "2. not-relevant",
            "3. relevant",
            "4. not-relevant",
        ]))
        monkeypatch.setattr("sidecar.httpx.post", post_mock)

        verify = _get_tool(mcp, "memory_verify")
        result = verify(memory_ids=ids, query="programming preferences")

        assert isinstance(result, list)
        verdicts = {r["memory"]["id"]: r["verified"] for r in result}
        assert verdicts[ids[0]] is True
        assert verdicts[ids[1]] is False
        assert verdicts[ids[2]] is True
        assert verdicts[ids[3]] is False

    def test_verify_tool_qwen_offline_returns_unverified(self, config, monkeypatch):
        import httpx as httpx_module

        mcp = server_module.create_server(config)
        ids = _seed_memories(mcp)

        def _raise(*args, **kwargs):
            raise httpx_module.ConnectError("refused")

        monkeypatch.setattr("sidecar.httpx.post", _raise)

        verify = _get_tool(mcp, "memory_verify")
        result = verify(memory_ids=ids, query="anything")

        assert len(result) == len(ids)
        assert all(r["verified"] is None for r in result)


class TestSearchVerify:
    def test_search_with_verify_filters_via_sidecar(self, config, monkeypatch):
        mcp = server_module.create_server(config)
        _seed_memories(mcp)

        # Search returns multiple — sidecar marks first relevant only
        def _post(*args, **kwargs):
            payload = kwargs.get("json", {})
            user_msg = payload["messages"][0]["content"]
            line_count = user_msg.count("\n1. ")  # at least 1 candidate numbered
            assert line_count >= 1
            # Mark first as relevant, others not-relevant
            verdicts = ["1. relevant"]
            for i in range(2, 11):
                verdicts.append(f"{i}. not-relevant")
            return _mock_qwen_response(verdicts)

        monkeypatch.setattr("sidecar.httpx.post", _post)

        search = _get_tool(mcp, "memory_search")
        results = search(query="Alice Rust", verify=True)

        # All results should be verified=True (filtered to relevant)
        assert len(results) >= 1
        assert all(r["verified"] is True for r in results)

    def test_search_with_verify_qwen_offline_returns_unfiltered(self, config, monkeypatch):
        import httpx as httpx_module

        mcp = server_module.create_server(config)
        _seed_memories(mcp)

        def _raise(*args, **kwargs):
            raise httpx_module.ConnectError("refused")

        monkeypatch.setattr("sidecar.httpx.post", _raise)

        search = _get_tool(mcp, "memory_search")
        results = search(query="Alice", verify=True)

        # Fail-open: results returned unfiltered with verified=None
        assert len(results) >= 1
        assert all(r["verified"] is None for r in results)

    def test_search_with_verify_malformed_response_is_fail_open(self, config, monkeypatch):
        mcp = server_module.create_server(config)
        _seed_memories(mcp)

        bad_resp = MagicMock()
        bad_resp.status_code = 200
        bad_resp.json.return_value = {"unexpected": "shape"}
        monkeypatch.setattr("sidecar.httpx.post", MagicMock(return_value=bad_resp))

        search = _get_tool(mcp, "memory_search")
        results = search(query="Alice", verify=True)

        # Did not crash; returned results unfiltered
        assert isinstance(results, list)
        assert all(r["verified"] is None for r in results)

    def test_search_without_verify_does_not_call_sidecar(self, config, monkeypatch):
        mcp = server_module.create_server(config)
        _seed_memories(mcp)

        post_mock = MagicMock()
        monkeypatch.setattr("sidecar.httpx.post", post_mock)

        search = _get_tool(mcp, "memory_search")
        results = search(query="Alice")

        post_mock.assert_not_called()
        # No verified field set when not verifying
        for r in results:
            assert r.get("verified") is None


class TestGlobalScope:
    def test_memory_store_scope_global_writes_to_global_db(self, config):
        mcp = server_module.create_server(config)
        store_tool = _get_tool(mcp, "memory_store")
        result = store_tool(content="A global preference", scope="global")
        assert result["action"] == "created"

        proj_conn = server_module._get_conn(config, "project")
        glob_conn = server_module._get_conn(config, "global")

        proj_count = proj_conn.execute(
            "SELECT COUNT(*) FROM memories"
        ).fetchone()[0]
        glob_count = glob_conn.execute(
            "SELECT COUNT(*) FROM memories"
        ).fetchone()[0]
        assert proj_count == 0
        assert glob_count == 1

    def test_memory_search_scope_all_returns_combined(self, config):
        mcp = server_module.create_server(config)
        store_tool = _get_tool(mcp, "memory_store")
        store_tool(content="Project fact about NanoClaw widgets", scope="project")
        store_tool(content="Global fact about Alice's widgets preference", scope="global")

        search = _get_tool(mcp, "memory_search")
        results = search(query="widgets", scope="all", limit=10)
        contents = [r["memory"]["content"] for r in results]
        assert any("Project fact" in c for c in contents)
        assert any("Global fact" in c for c in contents)

    def test_memory_stats_scope_global(self, config):
        mcp = server_module.create_server(config)
        store_tool = _get_tool(mcp, "memory_store")
        store_tool(content="A global fact", scope="global")
        store_tool(content="A project fact", scope="project")

        stats_tool = _get_tool(mcp, "memory_stats")
        global_stats = stats_tool(scope="global")
        project_stats = stats_tool(scope="project")

        assert global_stats["total_active"] == 1
        assert project_stats["total_active"] == 1


class TestPrune:
    def test_prune_dry_run_tool(self, config):
        mcp = server_module.create_server(config)
        store_tool = _get_tool(mcp, "memory_store")
        r = store_tool(content="prunable low-trust fact", trust="low")

        prune_tool = _get_tool(mcp, "memory_prune")
        result = prune_tool(dry_run=True)

        assert result["dry_run"] is True
        assert result["count"] >= 1
        ids = [c["id"] for c in result["candidates"]]
        assert r["id"] in ids

        # Verify still active (not modified)
        conn = server_module._get_conn(config, "project")
        row = conn.execute("SELECT active FROM memories WHERE id = ?", (r["id"],)).fetchone()
        assert row["active"] == 1

    def test_prune_execute_tool(self, config):
        mcp = server_module.create_server(config)
        store_tool = _get_tool(mcp, "memory_store")
        r = store_tool(content="prunable low-trust fact for archive", trust="low")

        prune_tool = _get_tool(mcp, "memory_prune")
        result = prune_tool(dry_run=False)

        assert result["dry_run"] is False
        ids = [c["id"] for c in result["candidates"]]
        assert r["id"] in ids

        conn = server_module._get_conn(config, "project")
        row = conn.execute("SELECT active FROM memories WHERE id = ?", (r["id"],)).fetchone()
        assert row["active"] == 0


class TestMemoryContradict:
    def test_contradict_marks_both_sides(self, config):
        mcp = server_module.create_server(config)
        store = _get_tool(mcp, "memory_store")
        a = store(content="Claim A")["id"]
        b = store(content="Claim B")["id"]

        contradict = _get_tool(mcp, "memory_contradict")
        result = contradict(memory_id_a=a, memory_id_b=b)

        assert result["success"] is True

        from storage import get_by_id
        conn = server_module._get_conn(config, "project")
        entry_a = get_by_id(conn, a)
        entry_b = get_by_id(conn, b)
        assert b in entry_a.contradicts
        assert a in entry_b.contradicts

    def test_contradict_nonexistent_returns_error(self, config):
        mcp = server_module.create_server(config)
        store = _get_tool(mcp, "memory_store")
        a = store(content="Claim A")["id"]

        contradict = _get_tool(mcp, "memory_contradict")
        result = contradict(memory_id_a=a, memory_id_b="mem_nope")

        assert result["success"] is False
        assert "error" in result
