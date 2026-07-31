from __future__ import annotations

import json
from copy import deepcopy
from hashlib import sha256
from pathlib import Path

import pytest

from vilu_corpus.cli import build_parser, build_run
from vilu_corpus.config import canonical_hash, load_config, load_taxonomy
from vilu_corpus.report import load_report
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


def canonical_text_sha256(path: Path) -> str:
    """Hash a pinned text fixture after Git's required LF normalization."""
    normalized = path.read_bytes().replace(b"\r\n", b"\n")
    return sha256(normalized).hexdigest()


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
        "scan_limit": 7,
        "config_hash": canonical_hash(config),
        "taxonomy_hash": canonical_hash(taxonomy),
        "config_dir": tmp_path,
    }
    result = build_run(output_dir=first, **kwargs)
    build_run(output_dir=second, **kwargs)

    assert result == {
        "output": str(first),
        "raw_read_count": 7,
        "input_count": 6,
        "source_exhausted": False,
        "prefilter_skipped_count": 1,
        "accepted_count": 2,
        "review_count": 2,
        "rejected_count": 1,
        "duplicate_count": 1,
        "manifest_files": 9,
    }
    first_manifest = json.loads((first / "manifest.json").read_text(encoding="utf-8"))
    second_manifest = json.loads((second / "manifest.json").read_text(encoding="utf-8"))
    assert first_manifest["pipeline_version"] == "2"
    assert first_manifest == second_manifest

    validation = validate_run(
        first,
        {"CC0-1.0", "CC-BY-4.0", "CC-BY-SA-4.0", "PDM-1.0", "Public Domain"},
        min_accepted=2,
    )
    assert validation["valid"] is True
    assert validation["accepted_documents"] == 2

    review_text = (first / "review.csv").read_text(encoding="utf-8")
    rejected_text = (first / "rejected.jsonl").read_text(encoding="utf-8")
    assert "Myopia clinical evidence supports" not in review_text
    assert "Synthetic chemistry evidence" not in rejected_text


def test_limit_applies_after_deterministic_prefilter_with_strict_scan_bound(
    tmp_path: Path,
) -> None:
    fixture = tmp_path / "records.jsonl"
    rows = [
        record("wrong-language", language="German"),
        record("closed", open_type="Restricted"),
        record("old", date=2010),
        record("accepted-after-prefilter"),
        {},  # Would fail schema validation if the strict raw scan bound were exceeded.
    ]
    with fixture.open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")
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
        scan_limit=4,
        output_dir=tmp_path / "bounded",
        config_hash=canonical_hash(config),
        taxonomy_hash=canonical_hash(taxonomy),
        config_dir=tmp_path,
    )
    assert result["raw_read_count"] == 4
    assert result["input_count"] == 1
    assert result["prefilter_skipped_count"] == 3
    assert result["accepted_count"] == 1
    manifest = json.loads(
        (tmp_path / "bounded" / "manifest.json").read_text(encoding="utf-8")
    )
    assert manifest["selection"] == {
        "raw_read_limit": 4,
        "raw_read_count": 4,
        "candidate_limit": 1,
        "candidate_count": 1,
        "source_exhausted": False,
        "prefilter_skipped_count": 3,
        "prefilter_reasons": {
            "before_min_year": 1,
            "language_not_allowed": 1,
            "not_open_science": 1,
        },
    }


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
        scan_limit=1,
        output_dir=output,
        config_hash=canonical_hash(config),
        taxonomy_hash=canonical_hash(taxonomy),
        config_dir=tmp_path,
    )
    with (output / "stats.json").open("a", encoding="utf-8") as handle:
        handle.write(" ")
    with pytest.raises(ValueError, match="hash mismatch for stats.json"):
        validate_run(output, {"CC-BY-4.0"})


@pytest.mark.parametrize(
    ("rows", "minimum", "expected"),
    [
        ([record("empty", title="Unrelated", text="Synthetic chemistry. " * 310)], 1, 0),
        ([record("one")], 2, 1),
        ([record("one"), record("two", text="Hyperopia eye examination. " * 310)], 2, 2),
    ],
    ids=["empty", "insufficient", "successful"],
)
def test_acceptance_minimum_for_empty_insufficient_and_successful_samples(
    tmp_path: Path,
    rows: list[dict[str, object]],
    minimum: int,
    expected: int,
) -> None:
    fixture = tmp_path / f"{expected}.jsonl"
    with fixture.open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")
    loaded = load_config(MODULE_ROOT / "configs" / "corpus.yaml")
    taxonomy = load_taxonomy(MODULE_ROOT / "configs" / "taxonomy.yaml")
    config = deepcopy(loaded.data)
    config["source"] = {
        "kind": "fixture",
        "path": str(fixture),
        "required_fields": REQUIRED_FIELDS,
    }
    output = tmp_path / f"acceptance-{expected}"
    build_run(
        config,
        taxonomy,
        limit=len(rows),
        scan_limit=len(rows),
        output_dir=output,
        config_hash=canonical_hash(config),
        taxonomy_hash=canonical_hash(taxonomy),
        config_dir=tmp_path,
    )
    accepted_licenses = {"CC-BY-4.0"}
    if expected < minimum:
        with pytest.raises(
            ValueError,
            match=(
                rf"accepted_count_below_minimum: {expected} < {minimum}"
            ),
        ):
            validate_run(output, accepted_licenses, min_accepted=minimum)
        validation_report = json.loads(
            (output / "validation-report.json").read_text(encoding="utf-8")
        )
        assert validation_report["valid"] is False
        assert validation_report["failures"] == [
            {
                "code": "accepted_count_below_minimum",
                "actual": expected,
                "required": minimum,
            }
        ]
        assert "Myopia clinical evidence supports" not in json.dumps(validation_report)
    else:
        result = validate_run(output, accepted_licenses, min_accepted=minimum)
        assert result["accepted_documents"] == expected


def test_pinned_representative_sample_preserves_review_and_downstream_diagnostics(
    tmp_path: Path,
) -> None:
    fixture = (
        MODULE_ROOT
        / "tests"
        / "fixtures"
        / "common-corpus-ff9892ec-representative.txt"
    )
    assert canonical_text_sha256(fixture) == (
        "994069e2cda222eb016eaad6290e884e322d3da2cdd7dd123535d0564f6eb427"
    )
    loaded = load_config(MODULE_ROOT / "configs" / "corpus.yaml")
    taxonomy = load_taxonomy(MODULE_ROOT / "configs" / "taxonomy.yaml")
    config = deepcopy(loaded.data)
    config["source"] = {
        "kind": "fixture",
        "path": str(fixture),
        "required_fields": REQUIRED_FIELDS,
    }
    output = tmp_path / "representative"
    result = build_run(
        config,
        taxonomy,
        limit=6,
        scan_limit=8,
        output_dir=output,
        config_hash=canonical_hash(config),
        taxonomy_hash=canonical_hash(taxonomy),
        config_dir=tmp_path,
    )

    assert result == {
        "output": str(output),
        "raw_read_count": 8,
        "input_count": 6,
        "source_exhausted": False,
        "prefilter_skipped_count": 2,
        "accepted_count": 2,
        "review_count": 3,
        "rejected_count": 1,
        "duplicate_count": 0,
        "manifest_files": 9,
    }
    stats = json.loads((output / "stats.json").read_text(encoding="utf-8"))
    assert stats["prefilter_reasons"] == {
        "language_not_allowed": 1,
        "not_open_science": 1,
    }
    assert stats["downstream_reasons"] == {
        "review": {
            "date_missing_or_invalid": 1,
            "license_unknown": 1,
            "relevance_ambiguous": 1,
        },
        "rejected": {"not_relevant": 1},
    }


def test_acceptance_failure_preserves_safe_report_and_workflow_artifact() -> None:
    workflow = (
        MODULE_ROOT.parents[1] / ".github" / "workflows" / "vilu-corpus-pilot.yml"
    ).read_text(encoding="utf-8")

    assert "--min-candidates 1000" in workflow
    assert workflow.count(
        "if: ${{ always() && steps.build.outcome == 'success' }}"
    ) == 2


def test_validate_cli_accepts_candidate_threshold() -> None:
    args = build_parser().parse_args(
        [
            "validate",
            "--output",
            "runs/pilot-1000",
            "--min-candidates",
            "1000",
            "--min-accepted",
            "100",
        ]
    )

    assert args.min_candidates == 1000
    assert args.min_accepted == 100


def test_exhausted_source_and_missing_identifier_remain_diagnosable(
    tmp_path: Path,
) -> None:
    fixture = tmp_path / "records.jsonl"
    with fixture.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(json.dumps(record("", title="Myopia screening")) + "\n")
    loaded = load_config(MODULE_ROOT / "configs" / "corpus.yaml")
    taxonomy = load_taxonomy(MODULE_ROOT / "configs" / "taxonomy.yaml")
    config = deepcopy(loaded.data)
    config["source"] = {
        "kind": "fixture",
        "path": str(fixture),
        "required_fields": REQUIRED_FIELDS,
    }
    output = tmp_path / "exhausted"

    result = build_run(
        config,
        taxonomy,
        limit=2,
        scan_limit=10,
        output_dir=output,
        config_hash=canonical_hash(config),
        taxonomy_hash=canonical_hash(taxonomy),
        config_dir=tmp_path,
    )

    assert result["source_exhausted"] is True
    assert result["review_count"] == 1
    stats = json.loads((output / "stats.json").read_text(encoding="utf-8"))
    assert stats["downstream_reasons"]["review"] == {"identifier_missing": 1}

    with pytest.raises(
        ValueError,
        match="candidate_count_below_minimum: 1 < 2",
    ):
        validate_run(output, {"CC-BY-4.0"}, min_candidates=2)

    aggregate = load_report(output)
    assert aggregate["validation"]["valid"] is False
    assert aggregate["validation"]["diagnostics"]["source_exhausted"] is True


def test_out_of_taxonomy_ophthalmic_context_is_aggregated_without_acceptance(
    tmp_path: Path,
) -> None:
    fixture = tmp_path / "relevance-diagnostics.jsonl"
    rows = [
        record(
            "approved-alias",
            title="Ocular hypertension monitoring",
            text="Ocular hypertension monitoring in an ophthalmic cohort. " * 70,
        ),
        record(
            "ophthalmic-outside-taxonomy",
            title="Retinal microvascular geometry",
            text="Retinal imaging geometry and ocular anatomy methods. " * 70,
        ),
        record(
            "unrelated",
            title="Computer vision benchmark",
            text="Image classification architecture and benchmark results. " * 70,
        ),
    ]
    with fixture.open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")
    loaded = load_config(MODULE_ROOT / "configs" / "corpus.yaml")
    taxonomy = load_taxonomy(MODULE_ROOT / "configs" / "taxonomy.yaml")
    config = deepcopy(loaded.data)
    config["source"] = {
        "kind": "fixture",
        "path": str(fixture),
        "required_fields": REQUIRED_FIELDS,
    }
    output = tmp_path / "relevance-diagnostics"

    result = build_run(
        config,
        taxonomy,
        limit=3,
        scan_limit=3,
        output_dir=output,
        config_hash=canonical_hash(config),
        taxonomy_hash=canonical_hash(taxonomy),
        config_dir=tmp_path,
    )

    assert result["accepted_count"] == 1
    assert result["rejected_count"] == 2
    stats = json.loads((output / "stats.json").read_text(encoding="utf-8"))
    assert stats["downstream_reasons"]["rejected"] == {
        "not_relevant": 2,
        "ophthalmic_context_without_topic": 1,
    }
    rejected = [
        json.loads(line)
        for line in (output / "rejected.jsonl").read_text(encoding="utf-8").splitlines()
    ]
    outside = next(
        item for item in rejected if item["identifier"] == "ophthalmic-outside-taxonomy"
    )
    assert outside["relevance_score"] == 0
    assert outside["relevance_context_matches"] == ["ocular", "retinal"]
