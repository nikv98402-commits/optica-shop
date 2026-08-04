from __future__ import annotations

import io
import json
import time
from copy import deepcopy
from hashlib import sha256
from pathlib import Path

import pytest

from vilu_corpus import cli as cli_module
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
            title="ĞœĞ¸Ğ¾Ğ¿Ğ¸Ñ Ğ¸ Ğ¿Ñ€Ğ¾Ğ²ĞµÑ€ĞºĞ° Ğ·Ñ€ĞµĞ½Ğ¸Ñ",
            text="ĞœĞ¸Ğ¾Ğ¿Ğ¸Ñ Ñ‚Ñ€ĞµĞ±ÑƒĞµÑ‚ Ğ¿Ğ¾Ğ½ÑÑ‚Ğ½Ğ¾Ğ¹ Ğ¿Ñ€Ğ¾Ğ²ĞµÑ€ĞºĞ¸ Ğ·Ñ€ĞµĞ½Ğ¸Ñ Ğ¸ ĞºĞ¾Ñ€Ñ€ĞµĞºÑ†Ğ¸Ğ¸ Ñ€ĞµÑ„Ñ€Ğ°ĞºÑ†Ğ¸Ğ¸. " * 70,
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
        "data_files": {"train": "common_corpus_*/*.parquet"},
        "filters": [["language", "in", ["English", "Russian"]]],
        "filter_any": [["date", ">=", 2015], ["date", "in", [None]]],
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
        "input_count": 5,
        "source_exhausted": False,
        "scan_limit_reached": True,
        "prefilter_skipped_count": 2,
        "accepted_count": 2,
        "review_count": 2,
        "rejected_count": 1,
        "duplicate_count": 1,
        "manifest_files": 9,
    }
    first_manifest = json.loads((first / "manifest.json").read_text(encoding="utf-8"))
    second_manifest = json.loads((second / "manifest.json").read_text(encoding="utf-8"))
    assert first_manifest["pipeline_version"] == "3"
    assert first_manifest["source"]["data_files"] == {
        "train": "common_corpus_*/*.parquet"
    }
    assert first_manifest["source"]["filters"] == [
        ["language", "in", ["English", "Russian"]]
    ]
    assert first_manifest["source"]["filter_any"] == [
        ["date", ">=", 2015],
        ["date", "in", [None]],
    ]
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
        "scan_limit_reached": False,
        "prefilter_skipped_count": 3,
        "prefilter_reasons": {
            "before_min_year": 1,
            "language_not_allowed": 1,
            "not_open_science": 1,
        },
    }


def test_irrelevant_record_does_not_consume_bounded_candidate_limit(
    tmp_path: Path,
) -> None:
    fixture = tmp_path / "relevance-before-candidate.jsonl"
    rows = [
        record(
            "general-science-first",
            title="General chemistry methods",
            text="General chemistry laboratory methods and measurements. " * 70,
        ),
        record(
            "ophthalmology-second",
            title="Myopia screening",
            text="Myopia evidence and vision screening in an ophthalmic cohort. " * 70,
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
    output = tmp_path / "bounded-relevance"

    result = build_run(
        config,
        taxonomy,
        limit=1,
        scan_limit=2,
        output_dir=output,
        config_hash=canonical_hash(config),
        taxonomy_hash=canonical_hash(taxonomy),
        config_dir=tmp_path,
    )

    assert result["raw_read_count"] == 2
    assert result["input_count"] == 1
    assert result["prefilter_skipped_count"] == 1
    assert result["accepted_count"] == 1
    assert result["rejected_count"] == 1
    stats = json.loads((output / "stats.json").read_text(encoding="utf-8"))
    assert stats["prefilter_reasons"] == {"not_relevant": 1}
    rejected = [
        json.loads(line)
        for line in (output / "rejected.jsonl").read_text(encoding="utf-8").splitlines()
    ]
    assert rejected[0]["identifier"] == "general-science-first"
    assert rejected[0]["reasons"] == ["not_relevant"]


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
        "input_count": 5,
        "source_exhausted": False,
        "scan_limit_reached": True,
        "prefilter_skipped_count": 3,
        "accepted_count": 2,
        "review_count": 3,
        "rejected_count": 1,
        "duplicate_count": 0,
        "manifest_files": 9,
    }
    stats = json.loads((output / "stats.json").read_text(encoding="utf-8"))
    assert stats["prefilter_reasons"] == {
        "language_not_allowed": 1,
        "not_relevant": 1,
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
    assert "timeout-minutes: 75" in workflow
    assert "vilu-corpus-checkpoint-${{ github.run_id }}" in workflow
    assert "tools/vilu-corpus/runs/pilot-1000/checkpoint.json" in workflow
    assert "!tools/vilu-corpçM:¶‰Ëkºwµç@€€€€€€½¹™¥œ°(€€€€€€€Ñ…á½¹½µä°(€€€€€€€±¥µ¥ĞôÄ°(€€€€€€€Í…¹}±¥µ¥ĞôÄÄ°(€€€€€€€½ÕÑÁÕÑ}‘¥Èõ½ÕÑÁÕĞ°(€€€€€€€½¹™¥}¡…Í õ±½…‘•¹Í¡„ÈÔØ°(€€€€€€€Ñ…á½¹½µå}¡…Í õ…¹½¹¥…±}¡…Í ¡Ñ…á½¹½µä¤°(€€€€€€€½¹™¥}‘¥Èõ±½…‘•¹Á…Ñ ¹Á…É•¹Ğ°(€€€€€€€ÁÉ½É•ÍÍ}•Ù•ÉäôÄÀ°(€€€€€€€¡•­Á½¥¹Ñ}•Ù•ÉäôÄÀ°(€€€€€€€ÁÉ½É•ÍÍ}ÍÑÉ•…´õ¥¼¹MÑÉ¥¹%< ¤°(€€€€¤((€€€…ÍÍ•ÉĞÉ•ÍÕ±Ñl‰…•ÁÑ•‘}½Õ¹Ğ‰t€ôô€Ä(€€€…ÍÍ•ÉĞÉ•ÍÕ±Ñl‰É…İ}É•…‘}½Õ¹Ğ‰t€ôô€ÄÄ(()‘•˜Ñ•ÍÑ}ÍÑ…Ñ¥ÍÑ¥…±}±½İ}å¥•±‘}É•µ…¥¹Í}‘¥…¹½ÍÑ¥}…™Ñ•É}µÕ±Ñ¥Á±•}™½É•…ÍÑÌ (€€€ÑµÁ}Á…Ñ èA…Ñ °(€€€µ½¹­•åÁ…Ñ èÁåÑ•ÍĞ¹5½¹­•åA…Ñ °(¤€´ø9½¹”è(€€€±½…‘•€ô±½…‘}½¹™¥œ¡5=U1}I==P€¼€‰½¹™¥Ìˆ€¼€‰½ÉÁÕÌ¹å…µ°ˆ¤(€€€Ñ…á½¹½µä€ô±½…‘}Ñ…á½¹½µä¡5=U1}I==P€¼€‰½¹™¥Ìˆ€¼€‰Ñ…á½¹½µä¹å…µ°ˆ¤(€€€½¹™¥œ€ô‘••Á½Áä¡±½…‘•¹‘…Ñ„¤(€€€½¹™¥l‰Á¥Á•±¥¹”‰ul‰‰½Õ¹‘•‘}Í•±•Ñ¥½¸‰t¹ÕÁ‘…Ñ” (€€€€€€€ì(€€€€€€€€€€€€‰™½É•…ÍÑ}…™Ñ•Èˆè€ÄÀÀ°(€€€€€€€€€€€€‰µ¥¹}…•ÁÑ•ˆè€Ä°(€€€€€€€ô(€€€€¤(€€€É½İÌ€ôl(€€€€€€€É•½É (€€€€€€€€€€€˜‰Õ¹É•±…Ñ•µí¥¹‘•áôˆ°(€€€€€€€€€€€Ñ¥Ñ±”ô‰…Ñ…±åÍ¥Ìµ•Ñ¡½‘Ìˆ°(€€€€€€€€€€€Ñ•áĞô‰Må¹Ñ¡•Ñ¥Œ¡•µ¥ÍÑÉä•Ù¥‘•¹”…¹±…‰½É…Ñ½Éäµ•Ñ¡½‘Ì¸€ˆ€¨€ÜÀ°(€€€€€€€€¤(€€€€€€€™½È¥¹‘•à¥¸É…¹” ÈÀÀ¤(€€€t€¬mÉ•½É ‰±…Ñ”µÉ•±•Ù…¹Ğˆ¥t((€€€‘•˜™¥±Ñ•É•‘}É½İÌ¡Í½ÕÉ”è‘¥ÑmÍÑÈ°½‰©•Ñt°€¨©­İ…ÉÌè½‰©•Ğ¤è(€€€€€€€‘•°Í½ÕÉ”°­İ…ÉÌ(€€€€€€€å¥•±™É½´É½İÌ((€€€µ½¹­•åÁ…Ñ ¹Í•Ñ…ÑÑÈ¡±¥}µ½‘Õ±”°€‰¥Ñ•É}Í½ÕÉ”ˆ°™¥±Ñ•É•‘}É½İÌ¤(€€€½ÕÑÁÕĞ€ôÑµÁ}Á…Ñ €¼€‰ÍÑ…Ñ¥ÍÑ¥…°µ‘¥…¹½ÍÑ¥Œˆ((€€€É•ÍÕ±Ğ€ô‰Õ¥±‘}ÉÕ¸ (€€€€€€€½¹™¥œ°(€€€€€€€Ñ…á½¹½µä°(€€€€€€€±¥µ¥ĞôÄ°(€€€€€€€Í…¹}±¥µ¥ĞôÈÀÄ°(€€€€€€€½ÕÑÁÕÑ}‘¥Èõ½ÕÑÁÕĞ°(€€€€€€€½¹™¥}¡…Í õ±½…‘•¹Í¡„ÈÔØ°(€€€€€€€Ñ…á½¹½µå}¡…Í õ…¹½¹¥…±}¡…Í ¡Ñ…á½¹½µä¤°(€€€€€€€½¹™¥}‘¥Èõ±½…‘•¹Á…Ñ ¹Á…É•¹Ğ°(€€€€€€€ÁÉ½É•ÍÍ}•Ù•ÉäôÄÀÀ°(€€€€€€€¡•­Á½¥¹Ñ}•Ù•ÉäôÄÀÀ°(€€€€€€€ÁÉ½É•ÍÍ}ÍÑÉ•…´õ¥¼¹MÑÉ¥¹%< ¤°(€€€€¤((€€€…ÍÍ•ÉĞÉ•ÍÕ±Ñl‰…•ÁÑ•‘}½Õ¹Ğ‰t€ôô€Ä(€€€…ÍÍ•ÉĞÉ•ÍÕ±Ñl‰É…İ}É•…‘}½Õ¹Ğ‰t€ôô€ÈÀÄ(()‘•˜Ñ•ÍÑ}É•…¡…‰¥±¥Ñå}ÁÉ½©•Ñ¥½¹}½Ù•ÉÍ}Í…¹}…¹‘}ÉÕ¹Ñ¥µ•}±¥µ¥ÑÌ ¤€´ø9½¹”è(€€€ÁÉ½©•Ñ¥½¸€ô±¥}µ½‘Õ±”¹}É•…¡…‰¥±¥Ñå}ÁÉ½©•Ñ¥½¸ (€€€€€€€É…İ}É•…‘}½Õ¹ĞôÜÀÀÀ°(€€€€€€€…¹‘¥‘…Ñ•}½Õ¹ĞôĞÜ°(€€€€€€€…•ÁÑ•‘}ÁÉ½áå}½Õ¹ĞôØ°(€€€€€€€…¹‘¥‘…Ñ•}Ñ…É•ĞôÄÀÀÀ°(€€€€€€€…•ÁÑ•‘}Ñ…É•ĞôÄÀÀ°(€€€€€€€Í…¹}±¥µ¥ĞôÄÀÀÀÀÀ°(€€€€€€€•±…ÁÍ•‘}Í•½¹‘ÌôĞÔÄÄ¸äÜà°(€€€€€€€ÉÕ¹Ñ¥µ•}‰Õ‘•Ñ}Í•½¹‘ÌôĞÈÀÀ°(€€€€€€€½¹™¥‘•¹•}èôÈ¸ÔÜØ°(€€€€¤((€€€…ÍÍ•ÉĞÁÉ½©•Ñ¥½¹l‰…¹‘¥‘…Ñ•}É•…¡…‰±•}‰å}Í…¸‰t¥ÌQÉÕ”(€€€…ÍÍ•ÉĞÁÉ½©•Ñ¥½¹l‰É•…¡…‰±•}‰å}ÉÕ¹Ñ¥µ”‰t¥Ì…±Í”(€€€…ÍÍ•ÉĞÁÉ½©•Ñ¥½¹l‰ÁÉ½©•Ñ•‘}Ñ½Ñ…±}Í•½¹‘Ì‰t€ø€ĞÈÀÀ(€€€…ÍÍ•ÉĞÁÉ½©•Ñ¥½¹l‰É•…Í½¹}½‘•Ì‰t€ôôl‰Ñ…É•ÑÍ}Õ¹É•…¡…‰±•}İ¥Ñ¡¥¹}ÉÕ¹Ñ¥µ•}‰Õ‘•Ğ‰t(€€€…ÍÍ•ÉĞ€ (€€€€€€€€‰…¹‘¥‘…Ñ•}Ñ…É•Ñ}ÍÑ…Ñ¥ÍÑ¥…±±å}Õ¹±¥­•±å}İ¥Ñ¡¥¹}Í…¹}±¥µ¥Ğˆ(€€€€€€€¥¸ÁÉ½©•Ñ¥½¹l‰İ…É¹¥¹}½‘•Ì‰t(€€€€¤(()‘•˜Ñ•ÍÑ}‰Õ¥±‘}•¹™½É•Í}ÉÕ¹Ñ¥µ•}‰Õ‘•Ñ}‰•™½É•}™½É•…ÍÑ}‰½Õ¹‘…Éä (€€€ÑµÁ}Á…Ñ èA…Ñ °(€€€µ½¹­•åÁ…Ñ èÁåÑ•ÍĞ¹5½¹­•åA…Ñ °(¤€´ø9½¹”è(€€€±½…‘•€ô±½…‘}½¹™¥œ¡5=U1}I==P€¼€‰½¹™¥Ìˆ€¼€‰½ÉÁÕÌ¹å…µ°ˆ¤(€€€Ñ…á½¹½µä€ô±½…‘}Ñ…á½¹½µä¡5=U1}I==P€¼€‰½¹™¥Ìˆ€¼€‰Ñ…á½¹½µä¹å…µ°ˆ¤(€€€½¹™¥œ€ô‘••Á½Áä¡±½…‘•¹‘…Ñ„¤(€€€½¹™¥l‰Á¥Á•±¥¹”‰ul‰‰½Õ¹‘•‘}Í•±•Ñ¥½¸‰t¹ÕÁ‘…Ñ” (€€€€€€€ì(€€€€€€€€€€€€‰™½É•…ÍÑ}…™Ñ•Èˆè€ÔÀÀ°(€€€€€€€€€€€€‰µ¥¹}…•ÁÑ•ˆè€Ä°(€€€€€€€€€€€€‰ÉÕ¹Ñ¥µ•}‰Õ‘•Ñ}Í•½¹‘Ìˆè€Ä°(€€€€€€€ô(€€€€¤((€€€‘•˜™¥±Ñ•É•‘}É½İÌ¡Í½ÕÉ”è‘¥ÑmÍÑÈ°½‰©•Ñt°€¨©­İ…ÉÌè½‰©•Ğ¤è(€€€€€€€‘•°Í½ÕÉ”°­İ…ÉÌ(€€€€€€€å¥•±É•½É (€€€€€€€€€€€€‰Í±½ÜµÕ¹É•±…Ñ•ˆ°(€€€€€€€€€€€Ñ¥Ñ±”ô‰…Ñ…±åÍ¥Ìµ•Ñ¡½‘Ìˆ°(€€€€€€€€€€€Ñ•áĞô‰Må¹Ñ¡•Ñ¥Œ¡•µ¥ÍÑÉä•Ù¥‘•¹”…¹±…‰½É…Ñ½Éäµ•Ñ¡½‘Ì¸€ˆ€¨€ÜÀ°(€€€€€€€€¤((€€€±½¬€ô¥Ñ•È  À¸À°€È¸À°€È¸Ä¤¤(€€€µ½¹­•åÁ…Ñ ¹Í•Ñ…ÑÑÈ¡±¥}µ½‘Õ±”°€‰¥Ñ•É}Í½ÕÉ”ˆ°™¥±Ñ•É•‘}É½İÌ¤(€€€µ½¹­•åÁ…Ñ ¹Í•Ñ…ÑÑÈ¡±¥}µ½‘Õ±”¹Ñ¥µ”°€‰µ½¹½Ñ½¹¥Œˆ°±…µ‰‘„è¹•áĞ¡±½¬¤¤(€€€½ÕÑÁÕĞ€ôÑµÁ}Á…Ñ €¼€‰ÉÕ¹Ñ¥µ”µ‰•™½É”µ™½É•…ÍĞˆ((€€€İ¥Ñ ÁåÑ•ÍĞ¹É…¥Í•Ì¡±¥}µ½‘Õ±”¹I•…¡…‰¥±¥ÑåÉÉ½È¤è(€€€€€€€‰Õ¥±‘}ÉÕ¸ (€€€€€€€€€€€½¹™¥œ°(€€€€€€€€€€€Ñ…á½¹½µä°(€€€€€€€€€€€±¥µ¥ĞôÄÀ°(€€€€€€€€€€€Í…¹}±¥µ¥ĞôÄÀÀÀ°(€€€€€€€€€€€½ÕÑÁÕÑ}‘¥Èõ½ÕÑÁÕĞ°(€€€€€€€€€€€½¹™¥}¡…Í õ±½…‘•¹Í¡„ÈÔØ°(€€€€€€€€€€€Ñ…á½¹½µå}¡…Í õ…¹½¹¥…±}¡…Í ¡Ñ…á½¹½µä¤°(€€€€€€€€€€€½¹™¥}‘¥Èõ±½…‘•¹Á…Ñ ¹Á…É•¹Ğ°(€€€€€€€€€€€ÁÉ½É•ÍÍ}ÍÑÉ•…´õ¥¼¹MÑÉ¥¹%< ¤°(€€€€€€€€¤((€€€¡•­Á½¥¹Ğ€ô©Í½¸¹±½…‘Ì ¡½ÕÑÁÕĞ€¼€‰¡•­Á½¥¹Ğ¹©Í½¸ˆ¤¹É•…‘}Ñ•áĞ¡•¹½‘¥¹œô‰ÕÑ˜´àˆ¤¤(€€€…ÍÍ•ÉĞ¡•­Á½¥¹Ñl‰ÍÑ…ÑÕÌ‰t€ôô€‰™…¥±•ˆ(€€€…ÍÍ•ÉĞ¡•­Á½¥¹Ñl‰É…İ}É•…‘}½Õ¹Ğ‰t€ôô€Ä(€€€…ÍÍ•ÉĞ¡•­Á½¥¹Ñl‰É•…¡…‰¥±¥Ñä‰ul‰É•…Í½¹}½‘•Ì‰t€ôôl(€€€€€€€€‰Ñ…É•ÑÍ}Õ¹É•…¡…‰±•}İ¥Ñ¡¥¹}ÉÕ¹Ñ¥µ•}‰Õ‘•Ğˆ(€€€t(()‘•˜Ñ•ÍÑ}‰½Õ¹‘•‘}Í•±•Ñ¥½¹}Á½±¥å}ÕÍ•Í}‘•™…Õ±ÑÍ}…¹‘}Ù…±¥‘…Ñ•Í}½Ù•ÉÉ¥‘•Ì ¤€´ø9½¹”è(€€€½¹™¥œ€ôì‰Á¥Á•±¥¹”ˆèíõô((€€€…ÍÍ•ÉĞ±¥}µ½‘Õ±”¹}‰½Õ¹‘•‘}Í•±•Ñ¥½¹}Á½±¥ä¡½¹™¥œ¤€ôôì(€€€€€€€€‰µ•Ñ…‘…Ñ…}‰…Ñ¡}Í¥é”ˆè€ÄÈà°(€€€€€€€€‰™½É•…ÍÑ}…™Ñ•Èˆè€ÔÀÀ°(€€€€€€€€‰µ¥¹}…•ÁÑ•ˆè€ÄÀÀ°(€€€€€€€€‰ÉÕ¹Ñ¥µ•}‰Õ‘•Ñ}Í•½¹‘Ìˆè€ĞÈÀÀ¸À°(€€€€€€€€‰½¹™¥‘•¹•}èˆè€È¸ÔÜØ°(€€€ô((€€€½¹™¥l‰Á¥Á•±¥¹”‰ul‰‰½Õ¹‘•‘}Í•±•Ñ¥½¸‰t€ôì‰µ•Ñ…‘…Ñ…}‰…Ñ¡}Í¥é”ˆè€Áô(€€€İ¥Ñ ÁåÑ•ÍĞ¹É…¥Í•Ì¡Y…±Õ•ÉÉ½È°µ…Ñ ô‰µ•Ñ…‘…Ñ…}‰…Ñ¡}Í¥é”µÕÍĞ‰”É•…Ñ•ÈÑ¡…¸é•É¼ˆ¤è(€€€€€€€±¥}µ½‘Õ±”¹}‰½Õ¹‘•‘}Í•±•Ñ¥½¹}Á½±¥ä¡½¹™¥œ¤((€€€½¹™¥l‰Á¥Á•±¥¹”‰ul‰‰½Õ¹‘•‘}Í•±•Ñ¥½¸‰t€ô€‰¥¹Ù…±¥ˆ(€€€İ¥Ñ ÁåÑ•ÍĞ¹É…¥Í•Ì¡Y…±Õ•ÉÉ½È°µ…Ñ ô‰µÕÍĞ‰”„µ…ÁÁ¥¹œˆ¤è(€€€€€€€±¥}µ½‘Õ±”¹}‰½Õ¹‘•‘}Í•±•Ñ¥½¹}Á½±¥ä¡½¹™¥œ¤(()‘•˜Ñ•ÍÑ}‰Õ¥±‘}ÁÉ•Í•ÉÙ•Í}¡•­Á½¥¹Ñ}İ¡•¹}Í½ÕÉ•}™…¥±Ì (€€€ÑµÁ}Á…Ñ èA…Ñ °(€€€µ½¹­•åÁ…Ñ èÁåÑ•ÍĞ¹5½¹­•åA…Ñ °(¤€´ø9½¹”è(€€€É½İÌ€ômÉ•½É ‰‰•™½É”µ™…¥±ÕÉ”ˆ¤°É•½É ‰…±Í¼µ‰•™½É”µ™…¥±ÕÉ”ˆ¥t((€€€‘•˜™…¥±¥¹}Í½ÕÉ”¡Í½ÕÉ”è‘¥ÑmÍÑÈ°½‰©•Ñt°€¨©­İ…ÉÌè½‰©•Ğ¤è(€€€€€€€‘•°Í½ÕÉ”(€€€€€€€½±Õµ¹Ì€ô­İ…ÉÌ¹•Ğ ‰½±Õµ¹Ìˆ¤(€€€€€€€™½ÈÉ½Ü¥¸É½İÌè(€€€€€€€€€€€¥˜¥Í¥¹ÍÑ…¹”¡½±Õµ¹Ì°±¥ÍĞ¤è(€€€€€€€€€€€€€€€å¥•±í­•äèÙ…±Õ”™½È­•ä°Ù…±Õ”¥¸É½Ü¹¥Ñ•µÌ ¤¥˜­•ä¥¸½±Õµ¹Íô(€€€€€€€€€€€•±Í”è(€€€€€€€€€€€€€€€å¥•±É½Ü(€€€€€€€É…¥Í”IÕ¹Ñ¥µ•ÉÉ½È ‰MIPÕÁÍÑÉ•…´É•ÍÁ½¹Í”ˆ¤((€€€µ½¹­•åÁ…Ñ ¹Í•Ñ…ÑÑÈ¡±¥}µ½‘Õ±”°€‰¥Ñ•É}Í½ÕÉ”ˆ°™…¥±¥¹}Í½ÕÉ”¤(€€€±½…‘•€ô±½…‘}½¹™¥œ¡5=U1}I==P€¼€‰½¹™¥Ìˆ€¼€‰½ÉÁÕÌ¹å…µ°ˆ¤(€€€Ñ…á½¹½µä€ô±½…‘}Ñ…á½¹½µä¡5=U1}I==P€¼€‰½¹™¥Ìˆ€¼€‰Ñ…á½¹½µä¹å…µ°ˆ¤(€€€½ÕÑÁÕĞ€ôÑµÁ}Á…Ñ €¼€‰™…¥±•µ½ÕÑÁÕĞˆ((€€€İ¥Ñ ÁåÑ•ÍĞ¹É…¥Í•Ì¡IÕ¹Ñ¥µ•ÉÉ½È°µ…Ñ ô‰MIPÕÁÍÑÉ•…´É•ÍÁ½¹Í”ˆ¤è(€€€€€€€‰Õ¥±‘}ÉÕ¸ (€€€€€€€€€€€±½…‘•¹‘…Ñ„°(€€€€€€€€€€€Ñ…á½¹½µä°(€€€€€€€€€€€±¥µ¥ĞôÌ°(€€€€€€€€€€€Í…¹}±¥µ¥ĞôÌ°(€€€€€€€€€€€½ÕÑÁÕÑ}‘¥Èõ½ÕÑÁÕĞ°(€€€€€€€€€€€½¹™¥}¡…Í õ±½…‘•¹Í¡„ÈÔØ°(€€€€€€€€€€€Ñ…á½¹½µå}¡…Í õ…¹½¹¥…±}¡…Í ¡Ñ…á½¹½µä¤°(€€€€€€€€€€€½¹™¥}‘¥Èõ±½…‘•¹Á…Ñ ¹Á…É•¹Ğ°(€€€€€€€€€€€ÁÉ½É•ÍÍ}•Ù•ÉäôÄ°(€€€€€€€€€€€¡•­Á½¥¹Ñ}•Ù•ÉäôÄ°(€€€€€€€€€€€ÁÉ½É•ÍÍ}ÍÑÉ•…´õ¥¼¹MÑÉ¥¹%< ¤°(€€€€€€€€¤((€€€¡•­Á½¥¹Ñ}Ñ•áĞ€ô€¡½ÕÑÁÕĞ€¼€‰¡•­Á½¥¹Ğ¹©Í½¸ˆ¤¹É•…‘}Ñ•áĞ¡•¹½‘¥¹œô‰ÕÑ˜´àˆ¤(€€€¡•­Á½¥¹Ğ€ô©Í½¸¹±½…‘Ì¡¡•­Á½¥¹Ñ}Ñ•áĞ¤(€€€…ÍÍ•ÉĞ¡•­Á½¥¹Ñl‰ÍÑ…ÑÕÌ‰t€ôô€‰™…¥±•ˆ(€€€…ÍÍ•ÉĞ¡•­Á½¥¹Ñl‰•ÉÉ½É}ÑåÁ”‰t€ôô€‰IÕ¹Ñ¥µ•ÉÉ½Èˆ(€€€…ÍÍ•ÉĞ¡•­Á½¥¹Ñl‰É…İ}É•…‘}½Õ¹Ğ‰t€ôô€È(€€€…ÍÍ•ÉĞ€‰MIPÕÁÍÑÉ•…´É•ÍÁ½¹Í”ˆ¹½Ğ¥¸¡•­Á½¥¹Ñ}Ñ•áĞ(€€€…ÍÍ•ÉĞ€‰5å½Á¥„±¥¹¥…°•Ù¥‘•¹”ÍÕÁÁ½ÉÑÌˆ¹½Ğ¥¸¡•­Á½¥¹Ñ}Ñ•áĞ(()‘•˜Ñ•ÍÑ}‰Õ¥±‘}µ…É­Í}¡•­Á½¥¹Ñ}™…¥±•‘}İ¡•¹}Í½ÕÉ•}¥Í}•µÁÑä (€€€ÑµÁ}Á…Ñ èA…Ñ °(€€€µ½¹­•åÁ…Ñ èÁåÑ•ÍĞ¹5½¹­•åA…Ñ °(¤€´ø9½¹”è(€€€µ½¹­•åÁ…Ñ ¹Í•Ñ…ÑÑÈ¡±¥}µ½‘Õ±”°€‰¥Ñ•É}Í½ÕÉ”ˆ°±…µ‰‘„Í½ÕÉ”°€¨©­İ…ÉÌè¥Ñ•È  ¤¤¤(€€€±½…‘•€ô±½…‘}½¹™¥œ¡5=U1}I==P€¼€‰½¹™¥Ìˆ€¼€‰½ÉÁÕÌ¹å…µ°ˆ¤(€€€Ñ…á½¹½µä€ô±½…‘}Ñ…á½¹½µä¡5=U1}I==P€¼€‰½¹™¥Ìˆ€¼€‰Ñ…á½¹½µä¹å…µ°ˆ¤(€€€½ÕÑÁÕĞ€ôÑµÁ}Á…Ñ €¼€‰•µÁÑäµ½ÕÑÁÕĞˆ((€€€İ¥Ñ ÁåÑ•ÍĞ¹É…¥Í•Ì¡Y…±Õ•ÉÉ½È°µ…Ñ ô‰Í½ÕÉ”É•ÑÕÉ¹•¹¼É•½É‘Ìˆ¤è(€€€€€€€‰Õ¥±‘}ÉÕ¸ (€€€€€€€€€€€±½…‘•¹‘…Ñ„°(€€€€€€€€€€€Ñ…á½¹½µä°(€€€€€€€€€€€±¥µ¥ĞôÄ°(€€€€€€€€€€€Í…¹}±¥µ¥ĞôÄ°(€€€€€€€€€€€½ÕÑÁÕÑ}‘¥Èõ½ÕÑÁÕĞ°(€€€€€€€€€€€½¹™¥}¡…Í õ±½…‘•¹Í¡„ÈÔØ°(€€€€€€€€€€€Ñ…á½¹½µå}¡…Í õ…¹½¹¥…±}¡…Í ¡Ñ…á½¹½µä¤°(€€€€€€€€€€€½¹™¥}‘¥Èõ±½…‘•¹Á…Ñ ¹Á…É•¹Ğ°(€€€€€€€€¤((€€€¡•­Á½¥¹Ğ€ô©Í½¸¹±½…‘Ì ¡½ÕÑÁÕĞ€¼€‰¡•­Á½¥¹Ğ¹©Í½¸ˆ¤¹É•…‘}Ñ•áĞ¡•¹½‘¥¹œô‰ÕÑ˜´àˆ¤¤(€€€…ÍÍ•ÉĞ¡•­Á½¥¹Ñl‰ÍÑ…ÑÕÌ‰t€ôô€‰™…¥±•ˆ(€€€…ÍÍ•ÉĞ¡•­Á½¥¹Ñl‰•ÉÉ½É}ÑåÁ”‰t€ôô€‰Y…±Õ•ÉÉ½Èˆ(€€€…ÍÍ•ÉĞ¡•­Á½¥¹Ñl‰É…İ}É•…‘}½Õ¹Ğ‰t€ôô€À(()‘•˜Ñ•ÍÑ}‰Õ¥±‘}µ…É­Í}¡•­Á½¥¹Ñ}™…¥±•‘}İ¡•¹}½ÕÑÁÕÑ}İÉ¥Ñ•}™…¥±Ì (€€€ÑµÁ}Á…Ñ èA…Ñ °(€€€µ½¹­•åÁ…Ñ èÁåÑ•ÍĞ¹5½¹­•åA…Ñ °(¤€´ø9½¹”è(€€€±½…‘•€ô±½…‘}½¹™¥œ¡5=U1}I==P€¼€‰½¹™¥Ìˆ€¼€‰½ÉÁÕÌ¹å…µ°ˆ¤(€€€Ñ…á½¹½µä€ô±½…‘}Ñ…á½¹½µä¡5=U1}I==P€¼€‰½¹™¥Ìˆ€¼€‰Ñ…á½¹½µä¹å…µ°ˆ¤(€€€½ÕÑÁÕĞ€ôÑµÁ}Á…Ñ €¼€‰İÉ¥Ñ”µ™…¥±ÕÉ”µ½ÕÑÁÕĞˆ((€€€‘•˜™…¥±¥¹}İÉ¥Ñ•}½ÕÑÁÕÑÌ ©…ÉÌè½‰©•Ğ°€¨©­İ…ÉÌè½‰©•Ğ¤€´ø‘¥ÑmÍÑÈ°½‰©•Ñtè(€€€€€€€‘•°…ÉÌ°­İ…ÉÌ(€€€€€€€É…¥Í”IÕ¹Ñ¥µ•ÉÉ½È ‰MIP‘½Õµ•¹ĞÁ…å±½…ˆ¤((€€€Í½ÕÉ•}É½Ü€ôÉ•½É ‰İÉ¥Ñ”µ™…¥±ÕÉ”ˆ¤((€€€‘•˜‰½Õ¹‘•‘}Í½ÕÉ”¡Í½ÕÉ”è‘¥ÑmÍÑÈ°½‰©•Ñt°€¨©­İ…ÉÌè½‰©•Ğ¤è(€€€€€€€‘•°Í½ÕÉ”(€€€€€€€½±Õµ¹Ì€ô­İ…ÉÌ¹•Ğ ‰½±Õµ¹Ìˆ¤(€€€€€€€¥˜¥Í¥¹ÍÑ…¹”¡½±Õµ¹Ì°±¥ÍĞ¤è(€€€€€€€€€€€å¥•±í­•äèÙ…±Õ”™½È­•ä°Ù…±Õ”¥¸Í½ÕÉ•}É½Ü¹¥Ñ•µÌ ¤¥˜­•ä¥¸½±Õµ¹Íô(€€€€€€€•±Í”è(€€€€€€€€€€€å¥•±Í½ÕÉ•}É½Ü((€€€µ½¹­•åÁ…Ñ ¹Í•Ñ…ÑÑÈ¡±¥}µ½‘Õ±”°€‰¥Ñ•É}Í½ÕÉ”ˆ°‰½Õ¹‘•‘}Í½ÕÉ”¤(€€€µ½¹­•åÁ…Ñ ¹Í•Ñ…ÑÑÈ¡±¥}µ½‘Õ±”°€‰İÉ¥Ñ•}½ÕÑÁÕÑÌˆ°™…¥±¥¹}İÉ¥Ñ•}½ÕÑÁÕÑÌ¤((€€€İ¥Ñ ÁåÑ•ÍĞ¹É…¥Í•Ì¡IÕ¹Ñ¥µ•ÉÉ½È°µ…Ñ ô‰MIP‘½Õµ•¹ĞÁ…å±½…ˆ¤è(€€€€€€€‰Õ¥±‘}ÉÕ¸ (€€€€€€€€€€€±½…‘•¹‘…Ñ„°(€€€€€€€€€€€Ñ…á½¹½µä°(€€€€€€€€€€€±¥µ¥ĞôÄ°(€€€€€€€€€€€Í…¹}±¥µ¥ĞôÄ°(€€€€€€€€€€€½ÕÑÁÕÑ}‘¥Èõ½ÕÑÁÕĞ°(€€€€€€€€€€€½¹™¥}¡…Í õ±½…‘•¹Í¡„ÈÔØ°(€€€€€€€€€€€Ñ…á½¹½µå}¡…Í õ…¹½¹¥…±}¡…Í ¡Ñ…á½¹½µä¤°(€€€€€€€€€€€½¹™¥}‘¥Èõ±½…‘•¹Á…Ñ ¹Á…É•¹Ğ°(€€€€€€€€¤((€€€¡•­Á½¥¹Ñ}Ñ•áĞ€ô€¡½ÕÑÁÕĞ€¼€‰¡•­Á½¥¹Ğ¹©Í½¸ˆ¤¹É•…‘}Ñ•áĞ¡•¹½‘¥¹œô‰ÕÑ˜´àˆ¤(€€€¡•­Á½¥¹Ğ€ô©Í½¸¹±½…‘Ì¡¡•­Á½¥¹Ñ}Ñ•áĞ¤(€€€…ÍÍ•ÉĞ¡•­Á½¥¹Ñl‰ÍÑ…ÑÕÌ‰t€ôô€‰™…¥±•ˆ(€€€…ÍÍ•ÉĞ¡•­Á½¥¹Ñl‰•ÉÉ½É}ÑåÁ”‰t€ôô€‰IÕ¹Ñ¥µ•ÉÉ½Èˆ(€€€…ÍÍ•ÉĞ€‰MIP‘½Õµ•¹ĞÁ…å±½…ˆ¹½Ğ¥¸¡•­Á½¥¹Ñ}Ñ•áĞ(4(4)‘•˜Ñ•ÍÑ}Ù…±¥‘…Ñ•}±¥}…•ÁÑÍ}…¹‘¥‘…Ñ•}Ñ¡É•Í¡½± ¤€´ø9½¹”è4(€€€…ÉÌ€ô‰Õ¥±‘}Á…ÉÍ•È ¤¹Á…ÉÍ•}…ÉÌ 4(€€€€€€€l4(€€€€€€€€€€€€‰Ù…±¥‘…Ñ”ˆ°4(€€€€€€€€€€€€ˆ´µ½ÕÑÁÕĞˆ°4(€€€€€€€€€€€€‰ÉÕ¹Ì½Á¥±½Ğ´ÄÀÀÀˆ°4(€€€€€€€€€€€€ˆ´µµ¥¸µ…¹‘¥‘…Ñ•Ìˆ°4(€€€€€€€€€€€€ˆÄÀÀÀˆ°4(€€€€€€€€€€€€ˆ´µµ¥¸µ…•ÁÑ•ˆ°4(€€€€€€€€€€€€ˆÄÀÀˆ°4(€€€€€€€t4(€€€€¤4(4(€€€…ÍÍ•ÉĞ…ÉÌ¹µ¥¹}…¹‘¥‘…Ñ•Ì€ôô€ÄÀÀÀ4(€€€…ÍÍ•ÉĞ…ÉÌ¹µ¥¹}…•ÁÑ•€ôô€ÄÀÀ4(4(4)‘•˜Ñ•ÍÑ}•á¡…ÕÍÑ•‘}Í½ÕÉ•}…¹‘}µ¥ÍÍ¥¹}¥‘•¹Ñ¥™¥•É}É•µ…¥¹}‘¥…¹½Í…‰±” (€€€ÑµÁ}Á…Ñ èA…Ñ °4(¤€´ø9½¹”è4(€€€™¥áÑÕÉ”€ôÑµÁ}Á…Ñ €¼€‰É•½É‘Ì¹©Í½¹°ˆ4(€€€İ¥Ñ ™¥áÑÕÉ”¹½Á•¸ ‰Üˆ°•¹½‘¥¹œô‰ÕÑ˜´àˆ°¹•İ±¥¹”ô‰q¸ˆ¤…Ì¡…¹‘±”è4(€€€€€€€¡…¹‘±”¹İÉ¥Ñ”¡©Í½¸¹‘ÕµÁÌ¡É•½É ˆˆ°Ñ¥Ñ±”ô‰5å½Á¥„ÍÉ••¹¥¹œˆ¤¤€¬€‰q¸ˆ¤4(€€€±½…‘•€ô±½…‘}½¹™¥œ¡5=U1}I==P€¼€‰½¹™¥Ìˆ€¼€‰½ÉÁÕÌ¹å…µ°ˆ¤4(€€€Ñ…á½¹½µä€ô±½…‘}Ñ…á½¹½µä¡5=U1}I==P€¼€‰½¹™¥Ìˆ€¼€‰Ñ…á½¹½µä¹å…µ°ˆ¤4(€€€½¹™¥œ€ô‘••Á½Áä¡±½…‘•¹‘…Ñ„¤4(€€€½¹™¥l‰Í½ÕÉ”‰t€ôì4(€€€€€€€€‰­¥¹ˆè€‰™¥áÑÕÉ”ˆ°4(€€€€€€€€‰Á…Ñ ˆèÍÑÈ¡™¥áÑÕÉ”¤°4(€€€€€€€€‰É•ÅÕ¥É•‘}™¥•±‘ÌˆèIEU%I}%1L°4(€€€ô4(€€€½ÕÑÁÕĞ€ôÑµÁ}Á…Ñ €¼€‰•á¡…ÕÍÑ•ˆ4(4(€€€É•ÍÕ±Ğ€ô‰Õ¥±‘}ÉÕ¸ 4(€€€€€€€½¹™¥œ°4(€€€€€€€Ñ…á½¹½µä°4(€€€€€€€±¥µ¥ĞôÈ°4(€€€€€€€Í…¹}±¥µ¥ĞôÄÀ°4(€€€€€€€½ÕÑÁÕÑ}‘¥Èõ½ÕÑÁÕĞ°4(€€€€€€€½¹™¥}¡…Í õ…¹½¹¥…±}¡…Í ¡½¹™¥œ¤°4(€€€€€€€Ñ…á½¹½µå}¡…Í õ…¹½¹¥…±}¡…Í ¡Ñ…á½¹½µä¤°4(€€€€€€€½¹™¥}‘¥ÈõÑµÁ}Á…Ñ °4(€€€€¤4(4(€€€…ÍÍ•ÉĞÉ•ÍÕ±Ñl‰Í½ÕÉ•}•á¡…ÕÍÑ•‰t¥ÌQÉÕ”4(€€€…ÍÍ•ÉĞÉ•ÍÕ±Ñl‰É•Ù¥•İ}½Õ¹Ğ‰t€ôô€Ä4(€€€ÍÑ…ÑÌ€ô©Í½¸¹±½…‘Ì ¡½ÕÑÁÕĞ€¼€‰ÍÑ…ÑÌ¹©Í½¸ˆ¤¹É•…‘}Ñ•áĞ¡•¹½‘¥¹œô‰ÕÑ˜´àˆ¤¤4(€€€…ÍÍ•ÉĞÍÑ…ÑÍl‰‘½İ¹ÍÑÉ•…µ}É•…Í½¹Ì‰ul‰É•Ù¥•Ü‰t€ôôì‰¥‘•¹Ñ¥™¥•É}µ¥ÍÍ¥¹œˆè€Åô4(4(€€€İ¥Ñ ÁåÑ•ÍĞ¹É…¥Í•Ì 4(€€€€€€€Y…±Õ•ÉÉ½È°4(€€€€€€€µ…Ñ ô‰…¹‘¥‘…Ñ•}½Õ¹Ñ}‰•±½İ}µ¥¹¥µÕ´è€Ä€ğ€Èˆ°4(€€€€¤è4(€€€€€€€Ù…±¥‘…Ñ•}ÉÕ¸¡½ÕÑÁÕĞ°ì‰µ	d´Ğ¸À‰ô°µ¥¹}…¹‘¥‘…Ñ•ÌôÈ¤4(4(€€€…É•…Ñ”€ô±½…‘}É•Á½ÉĞ¡½ÕÑÁÕĞ¤4(€€€…ÍÍ•ÉĞ…É•…Ñ•l‰Ù…±¥‘…Ñ¥½¸‰ul‰Ù…±¥‰t¥Ì…±Í”4(€€€…ÍÍ•ÉĞ…É•…Ñ•l‰Ù…±¥‘…Ñ¥½¸‰ul‰‘¥…¹½ÍÑ¥Ì‰ul‰Í½ÕÉ•}•á¡…ÕÍÑ•‰t¥ÌQÉÕ”(€€€…ÍÍ•ÉĞ…É•…Ñ•l‰Ù…±¥‘…Ñ¥½¸‰ul‰‘¥…¹½ÍÑ¥Ì‰ul‰Í…¹}±¥µ¥Ñ}É•…¡•‰t¥Ì…±Í”(()‘•˜Ñ•ÍÑ}Í…¹}±¥µ¥Ñ}‰½Õ¹‘…Éå}¥Í}¹½Ñ}É•Á½ÉÑ•‘}…Í}Í½ÕÉ•}•á¡…ÕÍÑ¥½¸ (€€€ÑµÁ}Á…Ñ èA…Ñ °(¤€´ø9½¹”è(€€€™¥áÑÕÉ”€ôÑµÁ}Á…Ñ €¼€‰Í…¸µ±¥µ¥ĞµÉ•½É‘Ì¹©Í½¹°ˆ(€€€İ¥Ñ ™¥áÑÕÉ”¹½Á•¸ ‰Üˆ°•¹½‘¥¹œô‰ÕÑ˜´àˆ°¹•İ±¥¹”ô‰q¸ˆ¤…Ì¡…¹‘±”è(€€€€€€€¡…¹‘±”¹İÉ¥Ñ”¡©Í½¸¹‘ÕµÁÌ¡É•½É ‰…•ÁÑ•µ…Ğµ‰½Õ¹‘…Éäˆ¤¤€¬€‰q¸ˆ¤(€€€€€€€¡…¹‘±”¹İÉ¥Ñ” (€€€€€€€€€€€©Í½¸¹‘ÕµÁÌ (€€€€€€€€€€€€€€€É•½É (€€€€€€€€€€€€€€€€€€€€‰É•©•Ñ•µ…Ğµ‰½Õ¹‘…Éäˆ°(€€€€€€€€€€€€€€€€€€€Ñ¥Ñ±”ô‰…Ñ…±åÍ¥Ìµ•Ñ¡½‘Ìˆ°(€€€€€€€€€€€€€€€€€€€Ñ•áĞô‰Må¹Ñ¡•Ñ¥Œ¡•µ¥ÍÑÉä•Ù¥‘•¹”…¹±…‰½É…Ñ½Éäµ•Ñ¡½‘Ì¸€ˆ€¨€ÜÀ°(€€€€€€€€€€€€€€€€¤(€€€€€€€€€€€€¤(€€€€€€€€€€€€¬€‰q¸ˆ(€€€€€€€€¤(€€€±½…‘•€ô±½…‘}½¹™¥œ¡5=U1}I==P€¼€‰½¹™¥Ìˆ€¼€‰½ÉÁÕÌ¹å…µ°ˆ¤(€€€Ñ…á½¹½µä€ô±½…‘}Ñ…á½¹½µä¡5=U1}I==P€¼€‰½¹™¥Ìˆ€¼€‰Ñ…á½¹½µä¹å…µ°ˆ¤(€€€½¹™¥œ€ô‘••Á½Áä¡±½…‘•¹‘…Ñ„¤(€€€½¹™¥l‰Í½ÕÉ”‰t€ôì(€€€€€€€€‰­¥¹ˆè€‰™¥áÑÕÉ”ˆ°(€€€€€€€€‰Á…Ñ ˆèÍÑÈ¡™¥áÑÕÉ”¤°(€€€€€€€€‰É•ÅÕ¥É•‘}™¥•±‘ÌˆèIEU%I}%1L°(€€€ô(€€€½ÕÑÁÕĞ€ôÑµÁ}Á…Ñ €¼€‰Í…¸µ±¥µ¥Ğµ‰½Õ¹‘…Éäˆ((€€€É•ÍÕ±Ğ€ô‰Õ¥±‘}ÉÕ¸ (€€€€€€€½¹™¥œ°(€€€€€€€Ñ…á½¹½µä°(€€€€€€€±¥µ¥ĞôÈ°(€€€€€€€Í…¹}±¥µ¥ĞôÈ°(€€€€€€€½ÕÑÁÕÑ}‘¥Èõ½ÕÑÁÕĞ°(€€€€€€€½¹™¥}¡…Í õ…¹½¹¥…±}¡…Í ¡½¹™¥œ¤°(€€€€€€€Ñ…á½¹½µå}¡…Í õ…¹½¹¥…±}¡…Í ¡Ñ…á½¹½µä¤°(€€€€€€€½¹™¥}‘¥ÈõÑµÁ}Á…Ñ °(€€€€¤((€€€…ÍÍ•ÉĞÉ•ÍÕ±Ñl‰Í½ÕÉ•}•á¡…ÕÍÑ•‰t¥Ì…±Í”(€€€…ÍÍ•ÉĞÉ•ÍÕ±Ñl‰Í…¹}±¥µ¥Ñ}É•…¡•‰t¥ÌQÉÕ”(€€€ÍÑ…ÑÌ€ô©Í½¸¹±½…‘Ì ¡½ÕÑÁÕĞ€¼€‰ÍÑ…ÑÌ¹©Í½¸ˆ¤¹É•…‘}Ñ•áĞ¡•¹½‘¥¹œô‰ÕÑ˜´àˆ¤¤(€€€…ÍÍ•ÉĞÍÑ…ÑÍl‰Í½ÕÉ•}•á¡…ÕÍÑ•‰t¥Ì…±Í”(€€€…ÍÍ•ÉĞÍÑ…ÑÍl‰Í…¹}±¥µ¥Ñ}É•…¡•‰t¥ÌQÉÕ”(4(4)‘•˜Ñ•ÍÑ}½ÕÑ}½™}Ñ…á½¹½µå}½Á¡Ñ¡…±µ¥}½¹Ñ•áÑ}¥Í}…É•…Ñ•‘}İ¥Ñ¡½ÕÑ}…•ÁÑ…¹” 4(€€€ÑµÁ}Á…Ñ èA…Ñ °4(¤€´ø9½¹”è4(€€€™¥áÑÕÉ”€ôÑµÁ}Á…Ñ €¼€‰É•±•Ù…¹”µ‘¥…¹½ÍÑ¥Ì¹©Í½¹°ˆ4(€€€É½İÌ€ôl4(€€€€€€€É•½É 4(€€€€€€€€€€€€‰…ÁÁÉ½Ù•µ…±¥…Ìˆ°4(€€€€€€€€€€€Ñ¥Ñ±”ô‰=Õ±…È¡åÁ•ÉÑ•¹Í¥½¸µ½¹¥Ñ½É¥¹œˆ°4(€€€€€€€€€€€Ñ•áĞô‰=Õ±…È¡åÁ•ÉÑ•¹Í¥½¸µ½¹¥Ñ½É¥¹œ¥¸…¸½Á¡Ñ¡…±µ¥Œ½¡½ÉĞ¸€ˆ€¨€ÜÀ°4(€€€€€€€€¤°4(€€€€€€€É•½É 4(€€€€€€€€€€€€‰½Á¡Ñ¡…±µ¥Œµ½ÕÑÍ¥‘”µÑ…á½¹½µäˆ°4(€€€€€€€€€€€Ñ¥Ñ±”ô‰I•Ñ¥¹…°µ¥É½Ù…ÍÕ±…È•½µ•ÑÉäˆ°4(€€€€€€€€€€€Ñ•áĞô‰I•Ñ¥¹…°¥µ…¥¹œ•½µ•ÑÉä…¹½Õ±…È…¹…Ñ½µäµ•Ñ¡½‘Ì¸€ˆ€¨€ÜÀ°4(€€€€€€€€¤°4(€€€€€€€É•½É 4(€€€€€€€€€€€€‰Õ¹É•±…Ñ•ˆ°4(€€€€€€€€€€€Ñ¥Ñ±”ô‰½µÁÕÑ•ÈÙ¥Í¥½¸‰•¹¡µ…É¬ˆ°4(€€€€€€€€€€€Ñ•áĞô‰%µ…”±…ÍÍ¥™¥…Ñ¥½¸…É¡¥Ñ•ÑÕÉ”…¹‰•¹¡µ…É¬É•ÍÕ±ÑÌ¸€ˆ€¨€ÜÀ°4(€€€€€€€€¤°4(€€€t4(€€€İ¥Ñ ™¥áÑÕÉ”¹½Á•¸ ‰Üˆ°•¹½‘¥¹œô‰ÕÑ˜´àˆ°¹•İ±¥¹”ô‰q¸ˆ¤…Ì¡…¹‘±”è4(€€€€€€€™½ÈÉ½Ü¥¸É½İÌè4(€€€€€€€€€€€¡…¹‘±”¹İÉ¥Ñ”¡©Í½¸¹‘ÕµÁÌ¡É½Ü°•¹ÍÕÉ•}…Í¥¤õ…±Í”¤€¬€‰q¸ˆ¤4(€€€±½…‘•€ô±½…‘}½¹™¥œ¡5=U1}I==P€¼€‰½¹™¥Ìˆ€¼€‰½ÉÁÕÌ¹å…µ°ˆ¤4(€€€Ñ…á½¹½µä€ô±½…‘}Ñ…á½¹½µä¡5=U1}I==P€¼€‰½¹™¥Ìˆ€¼€‰Ñ…á½¹½µä¹å…µ°ˆ¤4(€€€½¹™¥œ€ô‘••Á½Áä¡±½…‘•¹‘…Ñ„¤4(€€€½¹™¥l‰Í½ÕÉ”‰t€ôì4(€€€€€€€€‰­¥¹ˆè€‰™¥áÑÕÉ”ˆ°4(€€€€€€€€‰Á…Ñ ˆèÍÑÈ¡™¥áÑÕÉ”¤°4(€€€€€€€€‰É•ÅÕ¥É•‘}™¥•±‘ÌˆèIEU%I}%1L°4(€€€ô4(€€€½ÕÑÁÕĞ€ôÑµÁ}Á…Ñ €¼€‰É•±•Ù…¹”µ‘¥…¹½ÍÑ¥Ìˆ4(4(€€€É•ÍÕ±Ğ€ô‰Õ¥±‘}ÉÕ¸ 4(€€€€€€€½¹™¥œ°4(€€€€€€€Ñ…á½¹½µä°4(€€€€€€€±¥µ¥ĞôÌ°4(€€€€€€€Í…¹}±¥µ¥ĞôÌ°4(€€€€€€€½ÕÑÁÕÑ}‘¥Èõ½ÕÑÁÕĞ°4(€€€€€€€½¹™¥}¡…Í õ…¹½¹¥…±}¡…Í ¡½¹™¥œ¤°4(€€€€€€€Ñ…á½¹½µå}¡…Í õ…¹½¹¥…±}¡…Í ¡Ñ…á½¹½µä¤°4(€€€€€€€½¹™¥}‘¥ÈõÑµÁ}Á…Ñ °4(€€€€¤4(4(€€€…ÍÍ•ÉĞÉ•ÍÕ±Ñl‰…•ÁÑ•‘}½Õ¹Ğ‰t€ôô€Ä4(€€€…ÍÍ•ÉĞÉ•ÍÕ±Ñl‰É•©•Ñ•‘}½Õ¹Ğ‰t€ôô€È4(€€€ÍÑ…ÑÌ€ô©Í½¸¹±½…‘Ì ¡½ÕÑÁÕĞ€¼€‰ÍÑ…ÑÌ¹©Í½¸ˆ¤¹É•…‘}Ñ•áĞ¡•¹½‘¥¹œô‰ÕÑ˜´àˆ¤¤4(€€€…ÍÍ•ÉĞÍÑ…ÑÍl‰‘½İ¹ÍÑÉ•…µ}É•…Í½¹Ì‰ul‰É•©•Ñ•‰t€ôôì4(€€€€€€€€‰¹½Ñ}É•±•Ù…¹Ğˆè€È°4(€€€€€€€€‰½Á¡Ñ¡…±µ¥}½¹Ñ•áÑ}İ¥Ñ¡½ÕÑ}Ñ½Á¥Œˆè€Ä°4(€€€ô4(€€€É•©•Ñ•€ôl4(€€€€€€€©Í½¸¹±½…‘Ì¡±¥¹”¤4(€€€€€€€™½È±¥¹”¥¸€¡½ÕÑÁÕĞ€¼€‰É•©•Ñ•¹©Í½¹°ˆ¤¹É•…‘}Ñ•áĞ¡•¹½‘¥¹œô‰ÕÑ˜´àˆ¤¹ÍÁ±¥Ñ±¥¹•Ì ¤4(€€€t4(€€€½ÕÑÍ¥‘”€ô¹•áĞ 4(€€€€€€€¥Ñ•´™½È¥Ñ•´¥¸É•©•Ñ•¥˜¥Ñ•µl‰¥‘•¹Ñ¥™¥•È‰t€ôô€‰½Á¡Ñ¡…±µ¥Œµ½ÕÑÍ¥‘”µÑ…á½¹½µäˆ4(€€€€¤4(€€€…ÍÍ•ÉĞ½ÕÑÍ¥‘•l‰É•±•Ù…¹•}Í½É”‰t€ôô€À4(€€€…ÍÍ•ÉĞ½ÕÑÍ¥‘•l‰É•±•Ù…¹•}½¹Ñ•áÑ}µ…Ñ¡•Ì‰t€ôôl‰½Õ±…Èˆ°€‰É•Ñ¥¹…°‰t4(