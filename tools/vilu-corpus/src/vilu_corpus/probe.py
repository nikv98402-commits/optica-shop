from __future__ import annotations

import json
from collections.abc import Iterable, Iterator
from pathlib import Path
from typing import Any

_SUPPORTED_FILTER_OPERATORS = {
    "==",
    "!=",
    "<",
    ">",
    "<=",
    ">=",
    "in",
    "not in",
}


def iter_source(
    source: dict[str, Any],
    *,
    columns: list[str] | None = None,
    additional_filters: list[list[Any]] | None = None,
    batch_size: int | None = None,
) -> Iterator[dict[str, Any]]:
    kind = source.get("kind")
    if kind == "fixture":
        path = Path(str(source["path"])).resolve()
        with path.open("r", encoding="utf-8") as handle:
            for line in handle:
                if line.strip():
                    value = json.loads(line)
                    if not isinstance(value, dict):
                        raise ValueError("fixture records must be JSON objects")
                    if columns is not None:
                        yield {key: value[key] for key in columns if key in value}
                    else:
                        yield value
        return
    if kind != "huggingface":
        raise ValueError(f"unsupported source kind: {kind}")
    try:
        from datasets import load_dataset
    except ImportError as error:
        raise RuntimeError("install the corpus dependencies before reading Hugging Face") from error
    kwargs = _hugging_face_load_kwargs(source)
    required_fields = set(source["required_fields"])
    if columns is not None:
        if not columns or not set(columns) <= required_fields:
            raise ValueError("Hugging Face source columns must be a non-empty required-field subset")
        kwargs["columns"] = list(columns)
    if additional_filters is not None:
        extra = _normalize_filters(additional_filters, required_fields=required_fields)
        kwargs["filters"] = [*kwargs.get("filters", []), *extra]
    if batch_size is not None:
        if batch_size <= 0:
            raise ValueError("Hugging Face source batch_size must be greater than zero")
        kwargs["batch_size"] = batch_size
    dataset: Iterable[dict[str, Any]] = load_dataset(
        str(source["repository"]),
        **kwargs,
    )
    yield from dataset


def _hugging_face_load_kwargs(source: dict[str, Any]) -> dict[str, Any]:
    kwargs: dict[str, Any] = {
        "split": str(source.get("split", "train")),
        "revision": str(source["revision"]),
        "streaming": True,
    }
    data_files = source.get("data_files")
    if data_files is not None:
        if not isinstance(data_files, (str, list, tuple, dict)) or not data_files:
            raise ValueError("Hugging Face source data_files must be non-empty")
        kwargs["data_files"] = data_files
    filters = source.get("filters")
    if filters is not None:
        kwargs["filters"] = _normalize_filters(
            filters,
            required_fields=set(source["required_fields"]),
        )
    return kwargs


def _normalize_filters(
    value: Any,
    *,
    required_fields: set[str],
) -> list[tuple[str, str, Any]]:
    if not isinstance(value, list) or not value:
        raise ValueError("Hugging Face source filters must be a non-empty list")
    normalized: list[tuple[str, str, Any]] = []
    for raw_filter in value:
        if not isinstance(raw_filter, (list, tuple)) or len(raw_filter) != 3:
            raise ValueError(
                "each Hugging Face source filter must contain field, operator and value"
            )
        field = str(raw_filter[0]).strip()
        operator = str(raw_filter[1]).strip()
        operand = raw_filter[2]
        if field not in required_fields:
            raise ValueError(f"Hugging Face source filter uses unknown field: {field}")
        if operator not in _SUPPORTED_FILTER_OPERATORS:
            raise ValueError(
                f"unsupported Hugging Face source filter operator: {operator}"
            )
        if operator in {"in", "not in"} and (
            not isinstance(operand, list) or not operand
        ):
            raise ValueError(
                f"Hugging Face source filter operator '{operator}' requires a non-empty list"
            )
        normalized.append((field, operator, operand))
    return normalized


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
        "data_files": source.get("data_files"),
        "filter_fields": [
            str(value[0])
            for value in source.get("filters", [])
            if isinstance(value, (list, tuple)) and value
        ],
        "required_fields": sorted(required),
        "observed_fields": sorted(actual),
        "schema_valid": True,
    }
