"""Tests for the shared LLM JSON envelope recovery used by every AI route."""

from __future__ import annotations

import pytest

from services.llm_json import (
    LLMJsonError,
    coerce_dict_list,
    collect_dict_objects,
    extract_dict_list,
    extract_json_blocks,
    extract_json_list,
    extract_json_object,
    extract_json_value,
    loads_jsonish,
    normalize_candidate,
    strip_reasoning,
)


class TestStripReasoning:
    def test_removes_think_blocks(self) -> None:
        assert strip_reasoning("<think>hmm</think>{\"a\": 1}") == '{"a": 1}'

    def test_removes_unpaired_closing_tag(self) -> None:
        assert strip_reasoning('</think>{"a": 1}') == '{"a": 1}'

    def test_removes_reasoning_preamble(self) -> None:
        assert strip_reasoning('Thinking process: {"a": 1}') == '{"a": 1}'

    def test_plain_text_is_unchanged(self) -> None:
        assert strip_reasoning("  plain  ") == "plain"


class TestExtractJsonBlocks:
    def test_finds_outer_and_nested_blocks(self) -> None:
        # The scanner starts at every opener; callers take the first usable block.
        blocks = extract_json_blocks('pre {"a": {"b": 1}} post')
        assert blocks[0] == '{"a": {"b": 1}}'
        assert '{"b": 1}' in blocks

    def test_ignores_brackets_inside_strings(self) -> None:
        assert extract_json_blocks('{"a": "}"}') == ['{"a": "}"}']

    def test_finds_array(self) -> None:
        assert extract_json_blocks("see [1, 2] now") == ["[1, 2]"]

    def test_returns_empty_for_no_json(self) -> None:
        assert extract_json_blocks("no json here") == []


class TestNormalizeCandidate:
    def test_replaces_smart_quotes(self) -> None:
        assert normalize_candidate('{\u201ca\u201d: 1}') == '{"a": 1}'

    def test_drops_trailing_comma(self) -> None:
        assert normalize_candidate('{"a": 1,}') == '{"a": 1}'

    def test_strips_bom(self) -> None:
        assert normalize_candidate("\ufeff{}") == "{}"


class TestLoadsJsonish:
    def test_parses_valid_json(self) -> None:
        assert loads_jsonish('{"a": 1}') == {"a": 1}

    def test_parses_fenced_json(self) -> None:
        assert loads_jsonish('```json\n{"a": 1}\n```') == {"a": 1}

    def test_parses_python_literals(self) -> None:
        assert loads_jsonish("{'a': True, 'b': None}") == {"a": True, "b": None}

    def test_returns_none_for_garbage(self) -> None:
        assert loads_jsonish("not json at all") is None


class TestExtractJsonValue:
    def test_prefers_first_parseable_object(self) -> None:
        assert extract_json_value('{"a": 1} trailing {"b": 2}', preferred=dict) == {"a": 1}

    def test_recovers_from_prose_wrapper(self) -> None:
        prose = 'Sure! Here is the payload:\n```json\n{"a": 1}\n```\nHope that helps.'
        assert extract_json_value(prose, preferred=dict) == {"a": 1}

    def test_recovers_from_thinking_block(self) -> None:
        assert extract_json_value('<think>...</think>\n[{"q": 1}]', preferred=list) == [{"q": 1}]

    def test_raises_when_nothing_parses(self) -> None:
        with pytest.raises(LLMJsonError):
            extract_json_value("no json here")

    def test_raises_when_type_not_preferred(self) -> None:
        with pytest.raises(LLMJsonError):
            extract_json_value("[1, 2]", preferred=dict)


class TestTypedHelpers:
    def test_extract_json_object_returns_none_on_array(self) -> None:
        assert extract_json_object("[1]") is None

    def test_extract_json_list_returns_none_on_object(self) -> None:
        assert extract_json_list('{"a": 1}') is None

    def test_extract_json_object_parses(self) -> None:
        assert extract_json_object('{"a": 1}') == {"a": 1}


class TestDictListExtraction:
    def test_coerce_filters_non_dicts(self) -> None:
        assert coerce_dict_list([{"a": 1}, "x", 2, None]) == [{"a": 1}]

    def test_coerce_rejects_non_list(self) -> None:
        assert coerce_dict_list({"a": 1}) == []

    def test_extract_dict_list_from_bare_array(self) -> None:
        assert extract_dict_list([{"a": 1}]) == [{"a": 1}]

    def test_extract_dict_list_unwraps_questions_key(self) -> None:
        assert extract_dict_list({"questions": [{"q": 1}]}) == [{"q": 1}]

    def test_extract_dict_list_unwraps_practice_questions_key(self) -> None:
        assert extract_dict_list({"practice_questions": [{"q": 1}]}) == [{"q": 1}]

    def test_extract_dict_list_prefers_questions_over_data(self) -> None:
        payload = {"data": [{"d": 1}], "questions": [{"q": 1}]}
        assert extract_dict_list(payload) == [{"q": 1}]

    def test_extract_dict_list_returns_empty_for_unknown_envelope(self) -> None:
        assert extract_dict_list({"unknown": [{"q": 1}]}) == []


class TestCollectDictObjects:
    def test_salvages_multiple_objects_from_truncated_output(self) -> None:
        truncated = '{"question": "a", "correct": "A"} {"question": "b", "correct": "B"}'
        assert collect_dict_objects(truncated) == [
            {"question": "a", "correct": "A"},
            {"question": "b", "correct": "B"},
        ]

    def test_ignores_arrays(self) -> None:
        assert collect_dict_objects("[1, 2]") == []
