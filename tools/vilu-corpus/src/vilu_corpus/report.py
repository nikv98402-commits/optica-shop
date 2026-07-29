from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def load_report(output_dir: Path) -> dict[str, Any]:
    stats = json.loads((output_dir / "stats.json").read_text(encoding="utf-8"))
    manifest = json.loads((output_dir / "manifest.json").read_text(encoding="utf-8"))
    return {
        "stats": stats,
        "source": manifest["source"],
        "config_sha256": manifest["config_sha256"],
        "taxonomy_sha256": manifest["taxonomy_sha256"],
        "manifest_sha256s": manifest["files"],
    }
