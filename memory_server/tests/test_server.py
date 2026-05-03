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
        "Jake prefers Rust for systems work",
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
        results = search(query="Jake Rust", verify=True)

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
        results = search(query="Jake", verify=True)

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
        results = search(query="Jake", verify=True)

        # Did not crash; returned results unfiltered
        assert isinstance(results, list)
        assert all(r["verified"] is None for r in results)

    def test_search_without_verify_does_not_call_sidecar(self, config, monkeypatch):
        mcp = server_module.create_server(config)
        _seed_memories(mcp)

        post_mock = MagicMock()
        monkeypatch.setattr("sidecar.httpx.post", post_mock)

        search = _get_tool(mcp, "memory_search")
        results = search(query="Jake")

        post_mock.assert_not_called()
        # No verified field set when not verifying
        for r in results:
            assert r.get("verified") is None
