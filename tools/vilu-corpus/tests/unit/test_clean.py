from vilu_corpus.clean import clean_text, content_hash, normalized_for_hash


def test_clean_text_normalizes_formatting_without_rewriting() -> None:
    source = "  Myopia\u00a0care \r\n\r\n\r\n  keeps\tmeaning. \x00"
    assert clean_text(source) == "Myopia care\n\nkeeps meaning."


def test_content_hash_ignores_case_and_layout() -> None:
    assert content_hash("MYOPIA\n care") == content_hash("myopia care")
    assert normalized_for_hash("  A\nB ") == "a b"
