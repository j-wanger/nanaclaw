"""Sidecar verifier client for filtering memory search results via Qwen.

Wraps an HTTP call to a llama-server-style /v1/chat/completions endpoint to
classify each candidate as relevant/not-relevant for a given query. Designed
to fail-open: any error (offline, timeout, malformed response) returns the
input candidates unchanged with verified=None, never an exception.
"""

from __future__ import annotations

import logging
import re
from typing import Optional

import httpx

from config import SidecarConfig
from models import SearchResult

logger = logging.getLogger(__name__)


VERIFY_PROMPT_TEMPLATE = """You are a relevance verifier for a memory search.

Query: {query}

Candidates (one per line, numbered):
{candidates}

For EACH numbered candidate, output one line in the form:
N. relevant
or
N. not-relevant

Output exactly {n} lines, in order, no extra commentary."""


_VERDICT_LINE_RE = re.compile(r"^\s*(\d+)[.)]\s*(relevant|not[-\s]?relevant)\s*$", re.IGNORECASE)


class SidecarClient:
    """Binary relevant/not-relevant verifier backed by a chat-completions endpoint."""

    def __init__(self, config: SidecarConfig) -> None:
        self._config = config

    def verdicts(
        self,
        query: str,
        candidates: list[SearchResult],
    ) -> dict[str, Optional[bool]]:
        """Return {memory_id: relevant_bool_or_None} for each candidate.

        verified=None means the sidecar could not produce a verdict
        (disabled, offline, malformed) — caller should treat as unverified,
        not as "not relevant".
        """
        if not candidates:
            return {}
        if not self._config.enabled:
            return {c.memory.id: None for c in candidates}

        cap = self._config.max_candidates
        head = candidates[:cap]
        tail = candidates[cap:]

        raw = self._call_qwen(query, head)
        out: dict[str, Optional[bool]] = {}
        if raw is None:
            for c in candidates:
                out[c.memory.id] = None
            return out

        for idx, candidate in enumerate(head):
            out[candidate.memory.id] = raw.get(idx, False)
        for c in tail:
            out[c.memory.id] = None
        return out

    def verify_candidates(
        self,
        query: str,
        candidates: list[SearchResult],
    ) -> list[SearchResult]:
        """Filter candidates to those judged relevant by the sidecar.

        On Qwen unavailable / timeout / malformed response, returns all
        candidates unchanged with verified=None (fail-open).
        """
        if not candidates:
            return []

        if not self._config.enabled:
            return _passthrough(candidates)

        cap = self._config.max_candidates
        head = candidates[:cap]
        tail = candidates[cap:]

        verdicts = self._call_qwen(query, head)
        if verdicts is None:
            return _passthrough(candidates)

        filtered: list[SearchResult] = []
        for idx, candidate in enumerate(head):
            if verdicts.get(idx, False):
                copy = candidate.model_copy(update={"verified": True})
                filtered.append(copy)

        # Tail (beyond max_candidates) was never inspected — pass through unverified
        filtered.extend(_passthrough(tail))
        return filtered

    def _call_qwen(
        self,
        query: str,
        candidates: list[SearchResult],
    ) -> Optional[dict[int, bool]]:
        """Returns map of index -> relevant bool, or None on any failure."""
        numbered_lines = "\n".join(
            f"{i + 1}. {c.memory.content}" for i, c in enumerate(candidates)
        )
        prompt = VERIFY_PROMPT_TEMPLATE.format(
            query=query,
            candidates=numbered_lines,
            n=len(candidates),
        )

        try:
            response = httpx.post(
                self._config.endpoint,
                json={
                    "model": self._config.model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.0,
                },
                timeout=self._config.timeout_ms / 1000.0,
            )
        except (httpx.ConnectError, httpx.TimeoutException, httpx.HTTPError) as e:
            logger.warning(f"Sidecar Qwen unavailable: {e}")
            return None
        except Exception as e:
            logger.warning(f"Sidecar Qwen call failed: {e}")
            return None

        if response.status_code != 200:
            logger.warning(
                f"Sidecar returned {response.status_code}: {getattr(response, 'text', '')[:200]}"
            )
            return None

        try:
            data = response.json()
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, ValueError, TypeError) as e:
            logger.warning(f"Sidecar response malformed: {e}")
            return None

        return _parse_verdicts(content, len(candidates))


def _passthrough(candidates: list[SearchResult]) -> list[SearchResult]:
    return [c.model_copy(update={"verified": None}) for c in candidates]


def _parse_verdicts(text: str, expected_count: int) -> Optional[dict[int, bool]]:
    """Parse Qwen's numbered verdict lines into a {0-based-index: relevant} map.

    Returns None if no parseable lines found (treated as malformed, fail-open).
    """
    verdicts: dict[int, bool] = {}
    for line in text.splitlines():
        match = _VERDICT_LINE_RE.match(line.strip())
        if not match:
            continue
        n = int(match.group(1))
        verdict = match.group(2).lower().replace(" ", "-")
        idx = n - 1
        if 0 <= idx < expected_count:
            verdicts[idx] = (verdict == "relevant")

    if not verdicts:
        return None
    return verdicts
