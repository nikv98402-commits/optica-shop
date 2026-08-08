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
    adapter = str(source.get("adapter") or "").strip()
    if columns is not None:
        if not columns or not set(columns) <= required_fields:
            raise ValueError("Hugging Face source columns must be a non-empty required-field subset")
        # Adapted sources expose a raw schema that differs from the canonical
        # Candidate contract. Projecting canonical column names upstream would
        # fail before the adapter gets a chance to normalize the row.
        if not adapter:
            kwargs["columns"] = list(columns)
    if additional_filters is not None:
        if adapter:
            raise ValueError(
                "adapted Hugging Face sources do not support canonical upstream filters"
            )
        extra = _normalize_filters(additional_filters, required_fields=required_fields)
        kwargs["filters"] = _append_filters(kwargs.get("filters", []), extra)
    if batch_size is not None:
        if batch_size <= 0:
            raise ValueError("Hugging Face source batch_size must be greater than zero")
        if bool(source.get("supports_batch_size", True)):
            kwargs["batch_size"] = batch_size
    dataset: Iterable[dict[str, Any]] = load_dataset(
        str(source["repository"]),
        **kwargs,
    )
    # ``batch_size`` is a Parquet reader option and is intentionally passed to
    # ``load_dataset`` above. Do not additionally call
    # ``IterableDataset.iter(batch_size=...)`` here: that API buffers matching
    # rows until a complete user-facing batch is available. On a large,
    # selectively filtered corpus, the buffer can hide all progress for many
    # minutes before yielding the first row.
    for value in dataset:
        mapping = _adapt_source_row(adapter, value, source)
        if columns is not None:
            yield {key: mapping[key] for key in columns if key in mapping}
        else:
            yield mapping


def _adapt_source_row(
    adapter: str,
    value: dict[str, Any],
    source: dict[str, Any],
) -> dict[str, Any]:
    if not adapter:
        return value
    if adapter != "common_pile_pubmed":
        raise ValueError(f"unsupported source adapter: {adapter}")
    raw_required = set(source.get("raw_required_fields", []))
    missing = sorted(raw_required - set(value))
    if missing:
        raise ValueError(f"raw source schema missing fields: {', '.join(missing)}")
    metadata = value.get("metadata")
    if not isinstance(metadata, dict):
        raise ValueError("raw source metadata must be a mapping")
    text = str(value.get("text") or "")
    return {
        "identifier": str(value.get("id") or "").strip(),
        "collection": str(value.get("source") or "PubMed Central").strip(),
        "open_type": "Open Science",
        "curator": "common-pile/pubmed",
        "license": str(metadata.get("license") or "").strip(),
        "date": value.get("created"),
        "title": str(metadata.get("title") or "").strip(),
        "creator": _pubmed_authors(metadata.get("authors")),
        "language": "English",
        "language_type": "Written",
        "word_count": len(text.split()),
        # The upstream record does not publish a tokenizer-specific count.
        # Preserve that distinction instead of inventing an estimate.
        "token_count": 0,
        "text": text,
    }


def _pubmed_authors(value: Any) -> str:
    if not isinstance(value, list):
        return ""
    names: list[str] = []
    for author in value:
        if isinstance(author, dict):
            name = " ".join(
                str(author.get(part) or "").strip()
                for part in ("first", "middle", "last")
            ).strip()
        else:
            name = str(author or "").strip()
        if name:
            names.append(" ".join(name.split()))
    return "; ".join(names)


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
    required_fields = set(source["required_fields"])
    filters = source.get("filters")
    base_filters = (
        _normalize_filters(filters, required_fields=required_fields)
        if filters is not None
        else []
    )
    filter_any = source.get("filter_any")
    if filter_any is not None:
        alternatives = _normalize_filters(filter_any, required_fields=required_fields)
        kwargs["filters"] = [
            [*base_filters, alternative] for alternative in alternatives
        ]
    elif base_filters:
        kwargs["filters"] = base_filters
    return kwargs


def _append_filters(
    current: list[tuple[str, str, Any]] | list[list[tuple[str, str, Any]]],
    additional: list[tuple[str, str, Any]],
) -> list[tuple[str, str, Any]] | list[list[tuple[str, str, Any]]]:
    if current and isinstance(current[0], list):
        return [[*branch, *additional] for branch in current]  # type: ignore[list-item]
    return [*current, *additional]  # type: ignore[list-item]


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
    filters = source.get("filters", [])
    filter_any = source.get("filter_any", [])
    filter_fields = {
        str(value[0])
        for value in [*filters, *filter_any]
        if isinstance(value, (list, tuple)) and value
    }
    return {
        "source_kind": source["kind"],
        "repository": source.get("repository"),
        "revision": source.get("revision"),
        "adapter": source.get("adapter"),
        "data_files": source.get("data_files"),
        "filters": filters,
        "filter_any": filter_any,
        "filter_fields": sorted(filter_fields),
        "required_fields": sorted(required),
        "observed_fields": sorted(actual),
        "schema_valid": True,
    }
