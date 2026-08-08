import json
import sys
from types import SimpleNamespace
from pathlib import Path

import pytest

from vilu_corpus.config import load_config
from vilu_corpus.licenses import LicenseState, normalize_license
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


def test_pinned_primary_source_is_biomedical_and_exactly_reproducible() -> None:
    source = load_config(MODULE_ROOT / "configs" / "corpus.yaml").source

    kwargs = _hugging_face_load_kwargs(source)

    assert source["repository"] == "common-pile/pubmed"
    assert source["adapter"] == "common_pile_pubmed"
    assert source["supports_batch_size"] is False
    assert kwargs["revision"] == "648b8cfc93953ca0663a9c96a8d842a91b98fb64"
    assert "data_files" not in kwargs
    assert "filters" not in kwargs
    assert kwargs["streaming"] is True


def test_common_corpus_is_retained_only_as_secondary_enrichment() -> None:
    config = load_config(MODULE_ROOT / "configs" / "corpus.yaml")
    secondary = config.data["secondary_sources"]

    assert secondary == [
        {
            "purpose": "enrichment_only",
            "repository": "PleIAs/common_corpus",
            "revision": "ff9892ec787101ec881b2da279ed349085657aaf",
        }
    ]


@pytest.mark.parametrize(
    ("raw_license", "expected"),
    [
        (
            "Creative Commons - Attribution - "
            "https://creativecommons.org/licenses/by/4.0/",
            "CC-BY-4.0",
        ),
        (
            "Creative Commons - Attribution-ShareAlike - "
            "https://creativecommons.org/licenses/by-sa/4.0/",
            "CC-BY-SA-4.0",
        ),
        (
            "Creative Commons - CC0 - "
            "https://creativecommons.org/publicdomain/zero/1.0/",
            "CC0-1.0",
        ),
    ],
)
def test_pubmed_exact_license_metadata_is_normalized_fail_closed(
    raw_license: str,
    expected: str,
) -> None:
    config = load_config(MODULE_ROOT / "configs" / "corpus.yaml")

    accepted = normalize_license(raw_license, config.licenses)
    ambiguous = normalize_license("Creative Commons Attribution", config.licenses)

    assert accepted.state is LicenseState.ACCEPTED
    assert accepted.normalized == expected
    assert ambiguous.state is LicenseState.REVIEW


def test_pubmed_adapter_maps_raw_record_to_canonical_schema(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    text = "Myopia and retinal screening evidence. " * 90
    raw = {
        "id": "PMC123456",
        "text": text,
        "source": "PubMed Central",
        "added": "2024-06-05T03:55:45.923570",
        "created": "2021-08-17",
        "metadata": {
            "license": (
                "Creative Commons - Attribution - "
                "https://creativecommons.org/licenses/by/4.0/"
            ),
            "url": "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC123456/",
            "journal": "Example Ophthalmology Journal",
            "title": "Myopia screening",
            "authors": [
                {"first": "Ada", "last": "Lovelace"},
                {"first": "Grace", "last": "Hopper"},
            ],
        },
    }
    calls: list[dict[str, object]] = []

    def load_dataset(repository: str, **kwargs: object) -> list[dict[str, object]]:
        assert repository == "common-pile/pubmed"
        calls.append(kwargs)
        return [raw]

    monkeypatch.setitem(
        sys.modules,
        "datasets",
        SimpleNamespace(load_dataset=load_dataset),
    )
    source = load_config(MODULE_ROOT / "configs" / "corpus.yaml").source

    result = list(
        iter_source(
            source,
            columns=["identifier", "license", "creator", "text"],
            batch_size=128,
        )
    )

    assert result == [
        {
            "identifier": "PMC123456",
            "license": raw["metadata"]["license"],
            "creator": "Ada Lovelace; Grace Hopper",
            "text": text,
        }
    ]
    assert "columns" not in calls[0]
    assert "batch_size" not in calls[0]


def test_pubmed_adapter_fails_closed_on_raw_schema_drift(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setitem(
        sys.modules,
        "datasets",
        SimpleNamespace(load_dataset=lambda *args, **kwargs: [{"id": "PMC1"}]),
    )
    source = load_config(MODULE_ROOT / "configs" / "corpus.yaml").source

    with pytest.raises(ValueError, match="raw source schema missing fields"):
        list(iter_source(source))


def test_pubmed_adapter_rejects_invalid_metadata(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    raw = {
        "id": "PMC1",
        "text": "Myopia evidence",
        "source": "PubMed Central",
        "added": "2024-06-05",
        "created": "2021-08-17",
        "metadata": "not-a-mapping",
    }
    monkeypatch.setitem(
        sys.modules,
        "datasets",
        SimpleNamespace(load_dataset=lambda *args, **kwargs: [raw]),
    )
    source = load_config(MODULE_ROOT / "configs" / "corpus.yaml").source

    with pytest.raises(ValueError, match="raw source metadata must be a mapping"):
        list(iter_source(source))


def test_adapted_source_rejects_canonical_upstream_filters(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setitem(
        sys.modules,
        "datasets",
        SimpleNamespace(load_dataset=lambda *args, **kwargs: []),
    )
    source = load_config(MODULE_ROOT / "configs" / "corpus.yaml").source

    with pytest.raises(ValueError, match="do not support canonical upstream filters"):
        list(
            iter_source(
                source,
                additional_filters=[["identifier", "in", ["PMC1"]]],
            )
        )


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


def test_pinned_loader_preserves_undated_records_for_downstream_review(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[tuple[str, dict[str, object]]] = []
    undated_record = {
        "id": "PMC-undated-safe-id",
        "text": "Myopia and eye screening. " * 30,
        "source": "PubMed Central",
        "added": "2024-06-05T03:55:45.923570",
        "created": None,
        "metadata": {"license": "CC BY 4.0", "authors": []},
    }

    def load_dataset(repository: str, **kwargs: object) -> list[dict[str, object]]:
        calls.append((repository, kwargs))
        return [undated_record]

    monkeypatch.setitem(
        sys.modules,
        "datasets",
        SimpleNamespace(load_dataset=load_dataset),
    )
    source = load_config(MODULE_ROOT / "configs" / "corpus.yaml").source

    assert list(iter_source(source, columns=["identifier", "date"])) == [
        {"identifier": "PMC-undated-safe-id", "date": None}
    ]
    assert "filters" not in calls[0][1]
    assert "columns" not in calls[0][1]


def test_hugging_face_batch_size_configures_reader_without_buffering_rows(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[object] = []

    class BatchedDataset:
        def __iter__(self):
            calls.append("row-iterator")
            yield {"identifier": "first", "title": "Myopia"}
            yield {"identifier": "second", "title": "Astigmatism"}

        def iter(self, batch_size: int):
            del batch_size
            raise AssertionError("filtered rows must not be hidden behind a full batch")

    loader_calls: list[dict[str, object]] = []

    def load_dataset(*args: object, **kwargs: object) -> BatchedDataset:
        del args
        loader_calls.append(kwargs)
        return BatchedDataset()

    monkeypatch.setitem(
        sys.modules,
        "datasets",
        SimpleNamespace(load_dataset=load_dataset),
    )
    source = {
        "kind": "huggingface",
        "repository": "owner/dataset",
        "revision": "a" * 40,
        "required_fields": ["identifier", "title"],
    }

    assert list(iter_source(source, batch_size=2)) == [
        {"identifier": "first", "title": "Myopia"},
        {"identifier": "second", "title": "Astigmatism"},
    ]
    assert loader_calls[0]["batch_size"] == 2
    assert calls == ["row-iterator"]


def test_hugging_face_additional_filters_apply_to_every_or_branch(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[dict[str, object]] = []

    def load_dataset(repository: str, **kwargs: object) -> list[dict[str, str]]:
        del repository
        calls.append(kwargs)
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
        "filters": [["language", "==", "English"]],
        "filter_any": [["date", ">=", 2015], ["date", "in", [None]]],
        "required_fields": ["identifier", "language", "date"],
    }

    assert list(
        iter_source(
            source,
            additional_filters=[["identifier", "in", ["safe-id"]]],
        )
    ) == [{"identifier": "safe-id"}]
    assert calls[0]["filters"] == [
        [
            ("language", "==", "English"),
            ("date", ">=", 2015),
            ("identifier", "in", ["safe-id"]),
        ],
        [
            ("language", "==", "English"),
            ("date", "in", [None]),
            ("identifier", "in", ["safe-id"]),
        ],
    ]


def test_hugging_face_loader_projects_columns_and_adds_hydration_filter(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[tuple[str, dict[str, object]]] = []

    def load_dataset(repository: str, **kwargs: object) -> list[dict[str, str]]:
        calls.append((repository, kwargs))
        return [{"identifier": "safe-id", "title": "Myopia"}]

    monkeypatch.setitem(
        sys.modules,
        "datasets",
        SimpleNamespace(load_dataset=load_dataset),
    )
    source = {
        "kind": "huggingface",
        "repository": "owner/dataset",
        "revision": "a" * 40,
        "filters": [["date", ">=", 2015]],
        "required_fields": ["identifier", "title", "text", "date"],
    }

    assert list(
        iter_source(
            source,
            columns=["identifier", "title", "date"],
            additional_filters=[["identifier", "in", ["safe-id"]]],
            batch_size=128,
        )
    ) == [{"identifier": "safe-id", "title": "Myopia"}]
    assert calls == [
        (
            "owner/dataset",
            {
                "split": "train",
                "revision": "a" * 40,
                "streaming": True,
                "filters": [
                    ("date", ">=", 2015),
                    ("identifier", "in", ["safe-id"]),
                ],
                "columns": ["identifier", "title", "date"],
                "batch_size": 128,
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
            "filter_any": [["date", ">=", 2015], ["date", "in", [None]]],
            "required_fields": ["identifier", "text"],
        }
    )

    assert result["data_files"] == {"train": "common_corpus_*/*.parquet"}
    assert result["filters"] == [["language", "==", "English"]]
    assert result["filter_any"] == [
        ["date", ">=", 2015],
        ["date", "in", [None]],
    ]
    assert result["filter_fields"] == ["date", "language"]
    assert "SECRET FULL TEXT" not in json.dumps(result)
