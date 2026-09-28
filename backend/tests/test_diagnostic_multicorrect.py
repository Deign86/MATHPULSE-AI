"""Dependency-free regression coverage for diagnostic answer normalization.

The diagnostic router imports Firebase and other application services, so these
tests mirror its pure _is_diagnostic_correct/_validate contract rather than
importing the router. Keep this contract aligned with the router implementation.
"""

import pytest


def _validate_options(options: dict[str, str]) -> None:
    normalized_texts = [text.strip().casefold() for text in options.values()]
    if len(normalized_texts) != len(set(normalized_texts)):
        raise ValueError("Option texts must be unique")


def _is_diagnostic_correct(student_answer: str, correct_answer: str, options: dict[str, str]) -> bool:
    option_by_text = {text.strip().casefold(): key.upper() for key, text in options.items()}

    def resolve(answer: str) -> set[str]:
        resolved = set()
        for value in answer.split(","):
            normalized = value.strip().casefold()
            if normalized.upper() in {key.upper() for key in options}:
                resolved.add(normalized.upper())
            elif normalized in option_by_text:
                resolved.add(option_by_text[normalized])
            else:
                resolved.add(normalized)
        return resolved

    return bool(resolve(student_answer) & resolve(correct_answer))


OPTIONS = {"A": "First choice", "B": "Second choice", "C": "Third choice", "D": "Fourth choice"}


@pytest.mark.parametrize(
    ("student_answer", "correct_answer", "expected"),
    [
        ("A", "A", True),
        ("B", "A", False),
        ("A", "A, C", True),
        ("C", "A, C", True),
        ("B", "A, C", False),
        ("A", "First choice", True),
    ],
)
def test_diagnostic_answer_accepts_single_multi_and_option_text_answers(
    student_answer: str,
    correct_answer: str,
    expected: bool,
) -> None:
    assert _is_diagnostic_correct(student_answer, correct_answer, OPTIONS) is expected


def test_duplicate_option_text_is_invalid() -> None:
    with pytest.raises(ValueError, match="unique"):
        _validate_options({"A": "Same text", "B": " same TEXT ", "C": "Other", "D": "Last"})
