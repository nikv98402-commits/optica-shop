from vilu_corpus.licenses import LicenseState, normalize_license


CONFIG = {
    "accepted": ["CC0-1.0", "CC-BY-4.0"],
    "aliases": {"cc0": "CC0-1.0", "cc by 4.0": "CC-BY-4.0"},
}


def test_known_license_is_accepted_and_normalized() -> None:
    decision = normalize_license(" CC BY 4.0 ", CONFIG)
    assert decision.state is LicenseState.ACCEPTED
    assert decision.normalized == "CC-BY-4.0"


def test_unknown_and_missing_licenses_require_review() -> None:
    assert normalize_license("custom", CONFIG).reason == "license_unknown"
    assert normalize_license("", CONFIG).reason == "license_missing"
