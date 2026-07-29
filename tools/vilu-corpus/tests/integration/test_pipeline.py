from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

import pytest

from vilu_corpus.cli import build_run
from vilu_corpus.config import canonical_hash, load_config, load_taxonomy
from vilu_corpus.validate import validate_run

MODULE_ROOT = Path(__file__).resolve().parents[2]
REQUIRED_FIELDS = [
    "identifier",
    "collection",
    "open_type",
    "curator",
    "license",
    "date",
    "title",
    "creator",
    "language",
    "language_type",
    "word_count",
    "token_count",
    "text",
]


def record(identifier: str, **changes: object) -> dict[str, object]:
    text = "Myopia clinical evidence supports vision screening and refractive correction. " * 55
    value: dict[str, object] = {
        "identifier": identifier,
        "collection": "Synthetic Open Science",
        "open_type": "Open Science",
        "curator": "test-only",
        "license": "CC BY 4.0",
        "date": 2024,
        "title": "Myopia and vision screening",
        "creator": "Synthetic journal",
        "language": "English",
        "language_type": "Written",
        "word_count": len(text.split()),
        "token_count": 500,
        "text": text,
    }
    value.update(changes)
    return value


def write_fixture(path: Path) -> None:
    base = record("accepted-a")
    rows = [
        base,
        record("accepted-duplicate", text=base["text"]),
        record(
            "accepted-ru",
            title="Миопия и проверка зрения",
            text="Миопия требует понятной проверки зрения и коррекции рефракции. " * 70,
            language="Russian",
            word_count=490,
        ),
        record("review-license", license="Unverified custom license"),
        record("review-date", date=None),
        record("rejected-old", date=2010),
        record(
            "rejected-topic",
            title="Unrelated chemistry",
            text="Synthetic chemistry evidence and laboratory methods. " * 70,
            word_count=420,
        ),
    ]
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def test_bounded_pipeline_is_deterministic_and_valid(tmp_path: Path) -> None:
    fixture = tmp_path / "records.jsonl"
    write_fixture(fixture)
    loaded = load_config(MODULE_ROOT / "configs" / "corpus.yaml")
    taxonomy = load_taxonomy(MODULE_ROOT / "configs" / "taxonomy.yaml")
    config = deepcopy(loaded.data)
    config["source"] = {
        "kind": "fixture",
        "path": str(fixture),
        "required_fields": REQUIRED_FIELDS,
    }
    first = tmp_path / "first"
    second = tmp_path / "second"
    kwargs = {
        "config": config,
        "taxonomy": taxonomy,
        "limit": 7,
        "config_hash": canonical_hash(config),
        "taxonomy_hash": canonical_hash(taxonomy),
        "config_dir": tmp_path,
    }
    result = build_run(output_dir=first, **kwargs)
    build_run(output_dir=second, **kwargs)

    assert result == {
        "output": str(first),
        "input_count": 7,
        "accepted_count": 2,
        "review_count": 2,
        "rejected_count": 2,
        "duplicate_count": 1,
        "manifest_files": 9,
    }
    first_manifest = json.loads((first / "manifest.json").read_text(encoding="utf-8"))
    second_manifest = json.loads((second / "manifest.json").read_text(encoding="utf-8"))
    assert first_manifest == second_manifest

    validation = validate_run(first, {"CC0-1.0", "CC-BY-4.0", "CC-BY-SA-4.0", "PDM-1.0", "Public Domain"})
    assert validation["valid"] is True
    assert validation["accepted_documents"] == 2

    review_text = (first / "review.csv").read_text(encoding="utf-8")
    rejected_text = (first / "rejected.jsonl").read_text(encoding="utf-8")
    assert "Myopia clinical evidence supports" not in review_text
    assert "Synthetic chemistry evidence" not in rejected_text


def test_limit_bounds_input_records(tmp_path: Path) -> None:
    fixture = tmp_path / "records.jsonl"
    write_fixture(fixture)
    loaded = load_config(MODULE_ROOT / "configs" / "corpus.yaml")
    taxonomy = load_taxonomy(MODULE_ROOT / "configs" / "taxonomy.yaml")
    config = deepcopy(loaded.data)
    config["source"] = {
        "kind": "fixture",
        "path": str(fixture),
        "required_fields": REQUIRED_FIELDS,
    }
    result = build_run(
        config,
        taxonomy,
        limit=1,
        output_dir=tmp_path / "bounded",
        config_hash=canonical_hash(config),
        taxonomy_hash=canonical_hash(taxonomy),
        config_dir=tmp_path,
    )
    assert result["input_count"] == 1
    assert result["accepted_count"] == 1


def test_validation_detects_artifact_tampering(tmp_path: Path) -> None:
    fixture = tmp_path / "records.jsonl"
    write_fixture(fixture)
    loaded = load_config(MODULE_ROOT / "configs" / "corpus.yaml")
    taxonomy = load_taxonomy(MODULE_ROOT / "configs" / "taxonomy.yaml")
    config = deepcopy(loaded.data)
    config["source"] = {
        "kind": "fixture",
        "path": str(fixture),
        "required_fields": REQUIRED_FIELDS,
    }
    output = tmp_path / "tampered"
    build_run(
        config,
        taxonomy,
        limit=1,
        output_dir=output,
        config_hash=canonical_hash(config),
        taxonomy_hash=canonical_hash(taxonomy),
        config_dir=tmp_path,
    )
    with (output / "stats.json").open("a", encoding="utf-8") as handle:
        handle.write(" ")
    with pytest.raises(ValueError, match="hash mismatch for stats.json"):
        validate_run(output, {"CC-BY-4.0"})
