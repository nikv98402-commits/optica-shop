from pathlib import Path

import pytest

from vilu_corpus.config import load_config


def _write_config(path: Path, revision: str) -> None:
    path.write_text(
        "\n".join(
            [
                "pipeline: {}",
                "source:",
                "  kind: huggingface",
                f"  revision: {revision}",
                "licenses: {}",
                "selection: {}",
                "",
            ]
        ),
        encoding="utf-8",
    )


def test_hugging_face_revision_must_be_hexadecimal_sha(tmp_path: Path) -> None:
    config_path = tmp_path / "corpus.yaml"
    _write_config(config_path, "z" * 40)

    with pytest.raises(ValueError, match="hexadecimal SHA"):
        load_config(config_path)


def test_hugging_face_revision_accepts_exact_sha(tmp_path: Path) -> None:
    config_path = tmp_path / "corpus.yaml"
    _write_config(config_path, "a" * 40)

    assert load_config(config_path).source["revision"] == "a" * 40
