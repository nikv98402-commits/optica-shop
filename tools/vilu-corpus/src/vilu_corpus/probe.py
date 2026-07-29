from __future__ import annotations

import json
from collections.abc import Iterable, Iterator
from pathlib import Path
from typing import Any


def iter_source(source: dict[str, Any]) -> Iterator[dict[str, Any]]:
    kind = source.get("kind")
    if kind == "fixture":
        path = Path(str(source["path"])).resolve()
        with path.open("r", encoding="utf-8") as handle:
            for line in handle:
                if line.strip():
                    value = json.loads(line)
                    if not isinstance(value, dict):
                        raise ValueError("fixture records must be JSON objects")
                    yield value
        return
    if kind != "huggingface":
        raise ValueError(f"unsupported source kind: {kind}")
    try:
        from datasets import load_dataset
    except ImportError as error:
        raise RuntimeError("install the corpus dependencies before reading Hugging Face") from error
    dataset: Iterable[dict[str, Any]] = load_dataset(
        str(source["repository"]),
        split=str(source.get("split", "train")),
        revision=str(source["revision"]),
        streaming=True,
    )
    yield from dataset


def probe_source(source: dict[str, Any]) -> dict[str, Any]:
    first = next(iter_source(source), None)
    if first is None:
        raise ValueError("source returned no records")
    required = set(source["required_fields"])
    actual = set(first)
    missing = sorted(required - actual)
    if missing:
        raise ValueError(f"source schema missing fields: {', '.join(missing)}")
    return {
        "source_kind": source["kind"],
        "repository": source.get("repository"),
        "revision": source.get("revision"),
        "required_fields": sorted(required),
        "observed_fields": sorted(actual),
        "schema_valid": True,
    }
