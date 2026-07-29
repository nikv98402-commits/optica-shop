from __future__ import annotations

import re
from dataclasses import dataclass
from enum import StrEnum
from typing import Any


class LicenseState(StrEnum):
    ACCEPTED = "accepted"
    REVIEW = "review"


@dataclass(frozen=True, slots=True)
class LicenseDecision:
    state: LicenseState
    normalized: str
    reason: str


def normalize_license(value: str, config: dict[str, Any]) -> LicenseDecision:
    raw = re.sub(r"\s+", " ", value.strip())
    if not raw:
        return LicenseDecision(LicenseState.REVIEW, "", "license_missing")
    accepted = {str(item).casefold(): str(item) for item in config.get("accepted", [])}
    aliases = {str(key).casefold(): str(target) for key, target in config.get("aliases", {}).items()}
    key = raw.casefold()
    normalized = aliases.get(key, accepted.get(key, raw))
    if normalized.casefold() in accepted:
        return LicenseDecision(LicenseState.ACCEPTED, accepted[normalized.casefold()], "license_allowed")
    return LicenseDecision(LicenseState.REVIEW, normalized, "license_unknown")
