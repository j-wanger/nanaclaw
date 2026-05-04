"""Tests for sidecar verifier with graceful degradation."""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import MagicMock

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import SidecarConfig
from models import Category, MemoryEntry, SearchResult, Trust
from sidecar import SidecarClient


def _candidate(content: str, mem_id: str = "mem_test") -> SearchResult:
    entry = MemoryEntry(
        id=mem_id,
        content=content,
        category=Category.FACT,
        trust=Trust.MEDIUM,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    return SearchResult(memory=entry, score=1.0, match_type="hybrid")


def _mock_response(verdicts: list[str]) -> MagicMock:
    """Build a mock httpx response containing the Qwen JSON content."""
    body = "\n".join(verdicts)
    resp = MagicMock()
    resp.status_code = 200
    resp.json.return_value = {
        "choices": [{"message": {"content": body}}]
    }
    return resp


@pytest.fixture
def config():
    return SidecarConfig(
        enabled=True,
        endpoint="http://localhost:8080/v1/chat/completions",
        model="qwen",
        timeout_ms=3000,
        max_candidates=10,
    )


class TestVerifyCandidates:
    def test_returns_filtered_when_qwen_responds(self, config, monkeypatch):
        candidates = [
            _candidate("Alice prefers Rust", "mem_1"),
            _candidate("The sky is blue", "mem_2"),
            _candidate("Memory MCP uses SQLite", "mem_3"),
        ]

        post_mock = MagicMock(return_value=_mock_response([
            "1. relevant",
            "2. not-relevant",
            "3. relevant",
        ]))
        monkeypatch.setattr("sidecar.httpx.post", post_mock)

        client = SidecarClient(config)
        result = client.verify_candidates("user preferences", candidates)

        assert len(result) == 2
        ids = {r.memory.id for r in result}
        assert ids == {"mem_1", "mem_3"}
        assert all(r.verified is True for r in result)

    def test_returns_all_with_verified_none_when_qwen_unavailable(self, config, monkeypatch):
        import httpx as httpx_module

        candidates = [
            _candidate("a", "mem_1"),
            _candidate("b", "mem_2"),
        ]

        def _raise_connect_error(*args, **kwargs):
            raise httpx_module.ConnectError("connection refused")

        monkeypatch.setattr("sidecar.httpx.post", _raise_connect_error)

        client = SidecarClient(config)
        result = client.verify_candidates("query", candidates)

        assert len(result) == 2
        assert all(r.verified is None for r in result)
        assert {r.memory.id for r in result} == {"mem_1", "mem_2"}

    def test_returns_all_with_verified_none_on_timeout(self, config, monkeypatch):
        import httpx as httpx_module

        candidates = [_candidate("a", "mem_1")]

        def _raise_timeout(*args, **kwargs):
            raise httpx_module.TimeoutException("timeout")

        monkeypatch.setattr("sidecar.httpx.post", _raise_timeout)

        client = SidecarClient(config)
        result = client.verify_candidates("query", candidates)

        assert len(result) == 1
        assert result[0].verified is None

    def test_malformed_response_is_fail_open(self, config, monkeypatch):
        candidates = [
            _candidate("a", "mem_1"),
            _candidate("b", "mem_2"),
        ]

        bad_resp = MagicMock()
        bad_resp.status_code = 200
        bad_resp.json.return_value = {"unexpected": "shape"}
        monkeypatch.setattr("sidecar.httpx.post", MagicMock(return_value=bad_resp))

        client = SidecarClient(config)
        result = client.verify_candidates("query", candidates)

        assert len(result) == 2
        assert all(r.verified is None for r in result)

    def test_empty_candidates_returns_empty(self, config, monkeypatch):
        post_mock = MagicMock()
        monkeypatch.setattr("sidecar.httpx.post", post_mock)

        client = SidecarClient(config)
        result = client.verify_candidates("query", [])

        assert result == []
        post_mock.assert_not_called()

    def test_disabled_config_passes_through(self, monkeypatch):
        post_mock = MagicMock()
        monkeypatch.setattr("sidecar.httpx.post", post_mock)

        cfg = SidecarConfig(enabled=False)
        client = SidecarClient(cfg)
        candidates = [_candidate("a", "mem_1")]
        result = client.verify_candidates("query", candidates)

        assert len(result) == 1
        assert result[0].verified is None
        post_mock.assert_not_called()

    def test_http_error_status_is_fail_open(self, config, monkeypatch):
        candidates = [_candidate("a", "mem_1")]

        bad_resp = MagicMock()
        bad_resp.status_code = 500
        bad_resp.text = "server error"
        monkeypatch.setattr("sidecar.httpx.post", MagicMock(return_value=bad_resp))

        client = SidecarClient(config)
        result = client.verify_candidates("query", candidates)

        assert len(result) == 1
        assert result[0].verified is None

    def test_max_candidates_truncation(self, monkeypatch):
        cfg = SidecarConfig(enabled=True, max_candidates=2)
        candidates = [_candidate(f"c{i}", f"mem_{i}") for i in range(5)]

        post_mock = MagicMock(return_value=_mock_response([
            "1. relevant",
            "2. relevant",
        ]))
        monkeypatch.setattr("sidecar.httpx.post", post_mock)

        client = SidecarClient(cfg)
        result = client.verify_candidates("query", candidates)

        # Only first max_candidates were verified; remainder pass through with verified=None
        verified_results = [r for r in result if r.verified is True]
        unverified_results = [r for r in result if r.verified is None]
        assert len(verified_results) == 2
        assert len(unverified_results) == 3
