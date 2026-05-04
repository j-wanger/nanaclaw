from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import yaml


@dataclass
class EmbeddingConfig:
    mode: str = "local"  # local | server
    endpoint: Optional[str] = None
    model: str = "nomic-ai/nomic-embed-text-v1.5"


@dataclass
class SidecarConfig:
    enabled: bool = False
    endpoint: str = "http://localhost:8080/v1/chat/completions"
    model: str = "qwen"
    timeout_ms: int = 3000
    max_candidates: int = 10


@dataclass
class MemoryConfig:
    project_dir: str = ".memory"
    global_dir: str = field(default_factory=lambda: str(Path.home() / ".memory"))
    embedding: EmbeddingConfig = field(default_factory=EmbeddingConfig)
    sidecar: SidecarConfig = field(default_factory=SidecarConfig)

    @property
    def project_db_path(self) -> Path:
        return Path(self.project_dir) / "memory.db"

    @property
    def global_db_path(self) -> Path:
        return Path(self.global_dir) / "global.db"


def load_config(config_path: Optional[str] = None) -> MemoryConfig:
    if config_path and Path(config_path).exists():
        with open(config_path) as f:
            data = yaml.safe_load(f) or {}
        return _from_dict(data)

    env_path = os.environ.get("MEMORY_CONFIG")
    if env_path and Path(env_path).exists():
        with open(env_path) as f:
            data = yaml.safe_load(f) or {}
        return _from_dict(data)

    return _from_env()


def _from_env() -> MemoryConfig:
    cfg = MemoryConfig()
    if v := os.environ.get("MEMORY_PROJECT_DIR"):
        cfg.project_dir = v
    if v := os.environ.get("MEMORY_GLOBAL_DIR"):
        cfg.global_dir = v
    if v := os.environ.get("MEMORY_EMBEDDING_MODE"):
        cfg.embedding.mode = v
    if v := os.environ.get("MEMORY_EMBEDDING_ENDPOINT"):
        cfg.embedding.endpoint = v
    if v := os.environ.get("MEMORY_EMBEDDING_MODEL"):
        cfg.embedding.model = v
    return cfg


def _from_dict(data: dict) -> MemoryConfig:
    emb_data = data.get("embedding", {})
    emb = EmbeddingConfig(
        mode=emb_data.get("mode", "local"),
        endpoint=emb_data.get("endpoint"),
        model=emb_data.get("model", "nomic-ai/nomic-embed-text-v1.5"),
    )
    sc_data = data.get("sidecar", {})
    sc = SidecarConfig(
        enabled=sc_data.get("enabled", False),
        endpoint=sc_data.get("endpoint", "http://localhost:8080/v1/chat/completions"),
        model=sc_data.get("model", "qwen"),
        timeout_ms=sc_data.get("timeout_ms", 3000),
        max_candidates=sc_data.get("max_candidates", 10),
    )
    return MemoryConfig(
        project_dir=data.get("project_dir", ".memory"),
        global_dir=data.get("global_dir", str(Path.home() / ".memory")),
        embedding=emb,
        sidecar=sc,
    )
