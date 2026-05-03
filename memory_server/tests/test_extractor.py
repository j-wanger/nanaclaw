"""Tests for the transcript-to-memories extractor."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import SidecarConfig
from extractor import extract_memories
from models import MemoryEntry, Source, Trust


def _mock_qwen_response(content: str) -> MagicMock:
    resp = MagicMock()
    resp.status_code = 200
    resp.json.return_value = {"choices": [{"message": {"content": content}}]}
    return resp


@pytest.fixture
def config():
    return SidecarConfig(
        enabled=True,
        endpoint="http://localhost:8080/v1/chat/completions",
        model="qwen",
        timeout_ms=3000,
    )


SAMPLE_TRANSCRIPT = """User: I prefer Rust for new systems work.
Assistant: Got it.
User: Also, please remember the project uses SQLite, not Postgres.
Assistant: Noted."""


class TestExtractMemories:
    def test_returns_proposed_entries(self, config, monkeypatch):
        qwen_payload = json.dumps({
            "memories": [
                {
                    "content": "User prefers Rust for new systems work",
                    "category": "preference",
                    "context": "Stated in conversation",
                    "tags": ["rust", "preferences"],
                },
                {
                    "content": "Project uses SQLite (not Postgres)",
                    "category": "fact",
                    "context": "User correction",
                    "tags": ["database"],
                },
            ]
        })
        monkeypatch.setattr(
            "extractor.httpx.post",
            MagicMock(return_value=_mock_qwen_response(qwen_payload)),
        )

        out = extract_memories(SAMPLE_TRANSCRIPT, config)

        assert isinstance(out, list)
        assert len(out) == 2
        assert all(isinstance(m, MemoryEntry) for m in out)
        # Deterministic boundary: trust forced low, source forced inferred
        assert all(m.trust == Trust.LOW for m in out)
        assert all(m.source == Source.INFERRED for m in out)
        contents = {m.content for m in out}
        assert "User prefers Rust for new systems work" in contents

    def test_empty_transcript_returns_empty(self, config, monkeypatch):
        post_mock = MagicMock()
        monkeypatch.setattr("extractor.httpx.post", post_mock)
        out = extract_memories("", config)
        assert out == []
        post_mock.assert_not_called()

    def test_qwen_unavailable_returns_empty(self, config, monkeypatch):
        import httpx as httpx_module

        def _raise(*args, **kwargs):
            raise httpx_module.ConnectError("refused")

        monkeypatch.setattr("extractor.httpx.post", _raise)

        out = extract_memories(SAMPLE_TRANSCRIPT, config)
        assert out == []

    def test_malformed_response_returns_empty(self, config, monkeypatch):
        bad_resp = MagicMock()
        bad_resp.status_code = 200
        bad_resp.json.return_value = {"unexpected": "shape"}
        monkeypatch.setattr("extractor.httpx.post", MagicMock(return_value=bad_resp))

        out = extract_memories(SAMPLE_TRANSCRIPT, config)
        assert out == []

    def test_invalid_category_skipped_not_crashed(self, config, monkeypatch):
        qwen_payload = json.dumps({
            "memories": [
                {"content": "valid entry", "category": "fact"},
                {"content": "garbage entry", "category": "not-a-category"},
            ]
        })
        monkeypatch.setattr(
            "extractor.httpx.post",
            MagicMock(return_value=_mock_qwen_response(qwen_payload)),
        )

        out = extract_memories(SAMPLE_TRANSCRIPT, config)
        assert len(out) == 1
        assert out[0].content == "valid entry"

    def test_caller_provided_trust_overridden(self, config, monkeypatch):
        # Even if Qwen tries to claim trust=high, extractor forces low.
        qwen_payload = json.dumps({
            "memories": [
                {"content": "claimed high-trust", "category": "fact", "trust": "high"},
            ]
        })
        monkeypatch.setattr(
            "extractor.httpx.post",
            MagicMock(return_value=_mock_qwen_response(qwen_payload)),
        )

        out = extract_memories(SAMPLE_TRANSCRIPT, config)
        assert len(out) == 1
        assert out[0].trust == Trust.LOW
        assert out[0].source == Source.INFERRED

    def test_disabled_config_returns_empty(self, monkeypatch):
        post_mock = MagicMock()
        monkeypatch.setattr("extractor.httpx.post", post_mock)
        cfg = SidecarConfig(enabled=False)
        out = extract_memories(SAMPLE_TRANSCRIPT, cfg)
        assert out == []
        post_mock.assert_not_called()
