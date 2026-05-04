"""Configurable embedding provider with local (fastembed) and server modes."""

from __future__ import annotations

import logging
from typing import Optional

from config import EmbeddingConfig

logger = logging.getLogger(__name__)

# Try to import fastembed; set to None if unavailable
try:
    import fastembed as _fastembed
except ImportError:
    _fastembed = None
    logger.warning("fastembed not installed — local embedding mode will return None")

# Try to import httpx for server mode
try:
    import httpx
except ImportError:
    httpx = None
    logger.warning("httpx not installed — server embedding mode will return None")


class EmbeddingProvider:
    """Wraps embedding generation with two modes: local (fastembed) and server (HTTP)."""

    def __init__(self, config: EmbeddingConfig) -> None:
        self._config = config
        self._model = None  # Lazy-loaded for local mode

    def embed(self, text: str) -> Optional[list[float]]:
        """Embed a single text string. Returns None on failure."""
        if self._config.mode == "local":
            return self._embed_local(text)
        elif self._config.mode == "server":
            return self._embed_server(text)
        else:
            logger.error(f"Unknown embedding mode: {self._config.mode}")
            return None

    def embed_batch(self, texts: list[str]) -> Optional[list[list[float]]]:
        """Embed a batch of texts. Returns None on failure."""
        if not texts:
            return []

        if self._config.mode == "local":
            return self._embed_batch_local(texts)
        elif self._config.mode == "server":
            return self._embed_batch_server(texts)
        else:
            logger.error(f"Unknown embedding mode: {self._config.mode}")
            return None

    # -- Local mode (fastembed) --

    def _ensure_model(self) -> bool:
        """Lazy-load the fastembed model. Returns True if model is available."""
        if self._model is not None:
            return True
        if _fastembed is None:
            logger.warning("fastembed not available — cannot create local embeddings")
            return False
        try:
            self._model = _fastembed.TextEmbedding(model_name=self._config.model)
            return True
        except Exception as e:
            logger.error(f"Failed to load fastembed model {self._config.model}: {e}")
            return False

    def _embed_local(self, text: str) -> Optional[list[float]]:
        if not self._ensure_model():
            return None
        try:
            results = list(self._model.embed([text]))
            return [float(v) for v in results[0]]
        except Exception as e:
            logger.error(f"Local embed failed: {e}")
            return None

    def _embed_batch_local(self, texts: list[str]) -> Optional[list[list[float]]]:
        if not self._ensure_model():
            return None
        try:
            results = list(self._model.embed(texts))
            return [[float(v) for v in vec] for vec in results]
        except Exception as e:
            logger.error(f"Local embed_batch failed: {e}")
            return None

    # -- Server mode (HTTP) --

    def _embed_server(self, text: str) -> Optional[list[float]]:
        if not self._config.endpoint:
            logger.warning("No embedding endpoint configured for server mode")
            return None
        if httpx is None:
            logger.warning("httpx not available — cannot use server embedding mode")
            return None
        try:
            response = httpx.post(
                self._config.endpoint,
                json={"input": text, "model": self._config.model},
                timeout=30.0,
            )
            if response.status_code != 200:
                logger.error(
                    f"Embedding server returned {response.status_code}: {response.text}"
                )
                return None
            data = response.json()
            return data.get("embedding")
        except Exception as e:
            logger.error(f"Server embed failed: {e}")
            return None

    def _embed_batch_server(self, texts: list[str]) -> Optional[list[list[float]]]:
        if not self._config.endpoint:
            logger.warning("No embedding endpoint configured for server mode")
            return None
        if httpx is None:
            logger.warning("httpx not available — cannot use server embedding mode")
            return None
        try:
            response = httpx.post(
                self._config.endpoint,
                json={"input": texts, "model": self._config.model},
                timeout=30.0,
            )
            if response.status_code != 200:
                logger.error(
                    f"Embedding server returned {response.status_code}: {response.text}"
                )
                return None
            data = response.json()
            return data.get("embeddings")
        except Exception as e:
            logger.error(f"Server embed_batch failed: {e}")
            return None
