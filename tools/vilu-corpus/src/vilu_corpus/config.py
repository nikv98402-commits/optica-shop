from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml


@dataclass(frozen=True, slots=True)
class CorpusConfig:
    data: dict[str, Any]
    path: Path

    @property
    def pipeline(self) -> dict[str, Any]:
        return self.data["pipeline"]

    @property
    def source(self) -> dict[str, Any]:
        return self.data["source"]

    @property
    def licenses(self) -> dict[str, Any]:
        return self.data["licenses"]

    @property
    def selection(self) -> dict[str, Any]:
        return self.data["selection"]

    @property
    def sha256(self) -> str:
        canonical = json.dumps(self.data, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def load_config(path: str | Path) -> CorpusConfig:
    resolved = Path(path).resolve()
    with resolved.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)
    if not isinstance(data, dict):
        raise ValueError("corpus config must be a mapping")
    for key in ("pipeline", "source", "licenses", "selection"):
        if key not in data or not isinstance(data[key], dict):
            raise ValueError(f"corpus config missing mapping: {key}")
    revision = str(data["source"].get("revision", ""))
    if data["source"].get("kind") == "huggingface" and not re.fullmatch(r"[0-9a-fA-F]{40}", revision):
        raise ValueError("Hugging Face source revision must be an exact 40-character hexadecimal SHA")
    return CorpusConfig(data=data, path=resolved)


def load_taxonomy(path: str | Path) -> dict[str, Any]:
    resolved = Path(path).resolve()
    with resolved.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)
    if not isinstance(data, dict) or not isinstance(data.get("topics"), dict):
        raise ValueError("taxonomy config must contain a topics mapping")
    return data


def canonical_hash(value: Any) -> str:
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()
