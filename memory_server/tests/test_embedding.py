import sys
from pathlib import Path
from unittest.mock import MagicMock, patch, PropertyMock
import json

import pytest

# Add parent to path for direct imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import EmbeddingConfig
from embedding import EmbeddingProvider


class TestLocalModeEmbed:
    """Local mode using fastembed."""

    def test_embed_returns_list_of_floats(self):
        config = EmbeddingConfig(mode="local")
        provider = EmbeddingProvider(config)
        result = provider.embed("hello world")
        assert result is not None
        assert isinstance(result, list)
        assert len(result) == 768
        assert all(isinstance(v, float) for v in result)

    def test_embed_batch_returns_list_of_lists(self):
        config = EmbeddingConfig(mode="local")
        provider = EmbeddingProvider(config)
        texts = ["hello world", "goodbye world", "test embedding"]
        result = provider.embed_batch(texts)
        assert result is not None
        assert isinstance(result, list)
        assert len(result) == 3
        for vec in result:
            assert isinstance(vec, list)
            assert len(vec) == 768
            assert all(isinstance(v, float) for v in vec)

    def test_lazy_loads_model(self):
        """Model should not be loaded at init time, only on first call."""
        config = EmbeddingConfig(mode="local")
        provider = EmbeddingProvider(config)
        assert provider._model is None
        provider.embed("trigger load")
        assert provider._model is not None

    def test_embed_empty_string(self):
        config = EmbeddingConfig(mode="local")
        provider = EmbeddingProvider(config)
        result = provider.embed("")
        # fastembed should still return a vector for empty string
        assert result is not None
        assert isinstance(result, list)

    def test_embed_batch_empty_list(self):
        config = EmbeddingConfig(mode="local")
        provider = EmbeddingProvider(config)
        result = provider.embed_batch([])
        assert result is not None
        assert result == []


class TestServerModeEmbed:
    """Server mode using HTTP endpoint."""

    def test_embed_posts_to_endpoint(self):
        config = EmbeddingConfig(mode="server", endpoint="http://localhost:9999/embed")
        provider = EmbeddingProvider(config)

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"embedding": [0.1] * 768}

        with patch("embedding.httpx") as mock_httpx:
            mock_httpx.post.return_value = mock_response
            result = provider.embed("test text")

        assert result is not None
        assert result == [0.1] * 768
        mock_httpx.post.assert_called_once_with(
            "http://localhost:9999/embed",
            json={"input": "test text", "model": "nomic-ai/nomic-embed-text-v1.5"},
            timeout=30.0,
        )

    def test_embed_batch_posts_to_endpoint(self):
        config = EmbeddingConfig(mode="server", endpoint="http://localhost:9999/embed")
        provider = EmbeddingProvider(config)

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "embeddings": [[0.1] * 768, [0.2] * 768]
        }

        with patch("embedding.httpx") as mock_httpx:
            mock_httpx.post.return_value = mock_response
            result = provider.embed_batch(["text 1", "text 2"])

        assert result is not None
        assert len(result) == 2
        mock_httpx.post.assert_called_once_with(
            "http://localhost:9999/embed",
            json={"input": ["text 1", "text 2"], "model": "nomic-ai/nomic-embed-text-v1.5"},
            timeout=30.0,
        )

    def test_embed_handles_connection_error(self):
        config = EmbeddingConfig(mode="server", endpoint="http://localhost:9999/embed")
        provider = EmbeddingProvider(config)

        with patch("embedding.httpx") as mock_httpx:
            mock_httpx.post.side_effect = Exception("Connection refused")
            result = provider.embed("test text")

        assert result is None

    def test_embed_batch_handles_connection_error(self):
        config = EmbeddingConfig(mode="server", endpoint="http://localhost:9999/embed")
        provider = EmbeddingProvider(config)

        with patch("embedding.httpx") as mock_httpx:
            mock_httpx.post.side_effect = Exception("Connection refused")
            result = provider.embed_batch(["text 1"])

        assert result is None

    def test_embed_handles_non_200_status(self):
        config = EmbeddingConfig(mode="server", endpoint="http://localhost:9999/embed")
        provider = EmbeddingProvider(config)

        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"

        with patch("embedding.httpx") as mock_httpx:
            mock_httpx.post.return_value = mock_response
            result = provider.embed("test text")

        assert result is None

    def test_no_endpoint_returns_none(self):
        config = EmbeddingConfig(mode="server", endpoint=None)
        provider = EmbeddingProvider(config)
        result = provider.embed("test text")
        assert result is None


class TestGracefulDegradation:
    """When fastembed is not importable, local mode degrades gracefully."""

    def test_local_mode_without_fastembed(self):
        config = EmbeddingConfig(mode="local")
        provider = EmbeddingProvider(config)

        with patch("embedding._fastembed", None):
            result = provider.embed("test text")
        assert result is None

    def test_local_batch_without_fastembed(self):
        config = EmbeddingConfig(mode="local")
        provider = EmbeddingProvider(config)

        with patch("embedding._fastembed", None):
            result = provider.embed_batch(["test text"])
        assert result is None
