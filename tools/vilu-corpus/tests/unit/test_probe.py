import json
import sys
from types import SimpleNamespace
from pathlib import Path

import pytest

from vilu_corpus.config import load_config
from vilu_corpus.probe import _hugging_face_load_kwargs, iter_source, probe_source

MODULE_ROOT = Path(__file__).resolve().parents[2]


def test_probe_reports_schema_without_document_text(tmp_path: Path) -> None:
    fixture = tmp_path / "probe.jsonl"
    fixture.write_text(
        json.dumps({"identifier": "safe-id", "text": "SECRET FULL TEXT"}) + "\n",
        encoding="utf-8",
    )
    result = probe_source(
        {
            "kind": "fixture",
            "path": str(fixture),
            "required_fields": ["identifier", "text"],
        }
    )
    assert result["schema_valid"] is True
    assert "SECRET FULL TEXT" not in json.dumps(result)


def test_probe_fails_closed_on_schema_drift(tmp_path: Path) -> None:
    fixture = tmp_path / "probe.jsonl"
    fixture.write_text(json.dumps({"identifier": "safe-id"}) + "\n", encoding="utf-8")
    with pytest.raises(ValueError, match="source schema missing fields: text"):
        probe_source(
            {
                "kind": "fixture",
                "path": str(fixture),
                "required_fields": ["identifier", "text"],
            }
        )


def test_pinned_source_enumerates_all_shards_and_pushes_safe_filters() -> None:
    source = load_config(MODULE_ROOT / "configs" / "corpus.yaml").source

    kwargs = _hugging_face_load_kwargs(source)

    assert kwargs["revision"] == "ff9892ec787101ec881b2da279ed349085657aaf"
    assert kwargs["data_files"] == {"train": "common_corpus_*/*.parquet"}
    assert kwargs["filters"] == [
        ("open_type", "in", ["Open Science", "OpenScience"]),
        ("language", "in", ["English", "Russian"]),
    ]
    assert kwargs["streaming"] is True


def test_hugging_face_filters_fail_closed_on_unknown_fields() -> None:
    with pytest.raises(
        ValueError,
        match="source filter uses unknown field: unsafe",
    ):
        _hugging_face_load_kwargs(
            {
                "revision": "a" * 40,
                "required_fields": ["identifier"],
                "filters": [["unsafe", "==", "value"]],
            }
        )


def test_hugging_face_filters_fail_closed_on_invalid_membership_values() -> None:
    with pytest.raises(
        ValueError,
        match="'in' requires a non-empty list",
    ):
        _hugging_face_load_kwargs(
            {
                "revision": "a" * 40,
                "required_fields": ["language"],
                "filters": [["language", "in", []]],
            }
        )


@pytest.mark.parametrize(
    ("filters", "message"),
    [
        ([], "must be a non-empty list"),
        (["language", "=="], "must contain field, operator and value"),
        ([["language", "contains", "English"]], "unsupported.*operator"),
    ],
)
def test_hugging_face_filters_fail_closed_on_invalid_shapes(
    filters: object,
    message: str,
) -> None:
    with pytest.raises(ValueError, match=message):
        _hugging_face_load_kwargs(
            {
                "revision": "a" * 40,
                "required_fields": ["language"],
                "filters": filters,
            }
        )


def test_optional_hugging_face_selection_is_omitted_when_unconfigured() -> None:
    kwargs = _hugging_face_load_kwargs(
        {
            "revision": "a" * 40,
            "required_fields": ["language"],
        }
    )

    assert "data_files" not in kwargs
    assert "filters" not in kwargs


def test_hugging_face_data_files_fail_closed_when_empty() -> None:
    with pytest.raises(ValueError, match="data_files must be non-empty"):
        _hugging_face_load_kwargs(
            {
                "revision": "a" * 40,
                "required_fields": ["language"],
                "data_files": {},
            }
        )


def test_hugging_face_scalar_filter_is_normalized() -> None:
    kwargs = _hugging_face_load_kwargs(
        {
            "revision": "a" * 40,
            "required_fields": ["language"],
            "filters": [["language", "==", "English"]],
        }
    )

    assert kwargs["filters"] == [("language", "==", "English")]


def test_hugging_face_loader_receives_exact_bounded_selection(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[tuple[str, dict[str, object]]] = []

    def load_dataset(repository: str, **kwargs: object) -> list[dict[str, str]]:
        calls.append((repository, kwargs))
        return [{"identifier": "safe-id"}]

    monkeypatch.setitem(
        sys.modules,
        "datasets",
        SimpleNamespace(load_dataset=load_dataset),
    )
    source = {
        "kind": "huggingface",
        "repository": "owner/dataset",
        "revision": "a" * 40,
        "split": "train",
        "data_files": {"train": "common_corpus_*/*.parquet"},
        "filters": [["language", "in", ["English", "Russian"]]],
        "required_fields": ["identifier", "language"],
    }

    assert list(iter_source(source)) == [{"identifier": "safe-id"}]
    assert calls == [
        (
            "owner/dataset",
            {
                "split": "train",
                "revision": "a" * 40,
                "streaming": True,
                "data_files": {"train": "common_corpus_*/*.parquet"},
                "filters": [("language", "in", ["English", "Russian"])],
            },
        )
    ]


def test_probe_reports_selection_metadata_without_document_text(tmp_path: Path) -> None:
    fixture = tmp_path / "probe.jsonl"
    fixture.write_text(
        json.dumps({"identifier": "safe-id", "text": "SECRET FULL TEXT"}) + "\n",
        encoding="utf-8",
    )

    result = probe_source(
        {
            "kind": "fixture",
            "path": str(fixture),
            "data_files": {"train": "common_corpus_*/*.parquet"},
            "filters": [["language", "==", "English"]],
            "required_fields": ["identifier", "text"],
        }
    )

    assert result["data_files"] == {"train": "common_corpus_*/*.parquet"}
    assert result["filter_fields"] == ["language"]
    assert "SECRET FULL TEXT" not in json.dumps(result)
