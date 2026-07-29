import pytest

from vilu_corpus.writer import chunk_text


def test_chunking_is_bounded_and_deterministic() -> None:
    text = ("alpha beta gamma " * 20) + "\n\n" + ("delta epsilon " * 20)
    first = chunk_text(text, max_chars=120, overlap_chars=20)
    assert first == chunk_text(text, max_chars=120, overlap_chars=20)
    assert all(len(chunk) <= 120 for chunk in first)
    assert len(first) > 1


def test_invalid_chunking_configuration_is_rejected() -> None:
    with pytest.raises(ValueError):
        chunk_text("text", max_chars=100, overlap_chars=100)


def test_chunking_splits_single_word_that_exceeds_limit() -> None:
    chunks = chunk_text("a" * 251, max_chars=100, overlap_chars=20)

    assert chunks[:2] == ["a" * 100, "a" * 100]
    assert chunks[-1].endswith("a" * 51)
    assert all(len(chunk) <= 100 for chunk in chunks)
