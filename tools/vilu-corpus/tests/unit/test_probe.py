import json
from pathlib import Path

import pytest

from vilu_corpus.probe import probe_source


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
