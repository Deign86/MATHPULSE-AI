"""Tests for services.llm_text — the shared free-text cleanup for model prose."""
from __future__ import annotations

from services.llm_text import clean_llm_text, sanitize_tree, to_plain_text


class TestCleanLlmText:
    def test_strips_think_blocks_and_fences(self):
        raw = "<think>planning</think>\n```markdown\n**Hi** there\n```\n(Word count: 12)"
        assert clean_llm_text(raw) == "**Hi** there"

    def test_unclosed_think_prefix_dropped(self):
        raw = "<think>let me reason about this\n\nThe slope is 2."
        assert clean_llm_text(raw) == "The slope is 2."

    def test_literal_newlines_and_tex_delimiters(self):
        raw = "Step 1\\nStep 2 uses \\(x^2\\) and \\[a = b\\]"
        assert clean_llm_text(raw) == "Step 1\nStep 2 uses $x^2$ and $$a = b$$"

    def test_tex_commands_starting_with_n_t_r_survive(self):
        raw = r"$G = r \times d$, $\text{Profit} = S - C$, $a \neq b$, $\nabla f$, $\theta \to \rho$"
        assert clean_llm_text(raw) == raw

    def test_literal_escapes_before_prose_still_decode(self):
        assert clean_llm_text(r"Step 1\nThe next\n\nnext\t2") == "Step 1\nThe next\n\nnext  2"

    def test_double_escaped_tex_unescaped(self):
        assert clean_llm_text("Use $\\\\frac{1}{2}$") == "Use $\\frac{1}{2}$"

    def test_inner_code_block_preserved(self):
        raw = "Run:\n```python\nprint('\\n')\n```\nDone"
        assert clean_llm_text(raw) == raw

    def test_wrapping_quotes_and_label_removed(self):
        assert clean_llm_text('"Great job today!"') == "Great job today!"
        assert clean_llm_text("Message: Keep going") == "Keep going"

    def test_none_and_non_string(self):
        assert clean_llm_text(None) == ""
        assert clean_llm_text(42) == "42"


class TestToPlainText:
    def test_markdown_removed_math_kept(self):
        raw = "## **Key**: the *slope* is $m = \\frac{2}{3}$ — see [link](http://x)"
        assert to_plain_text(raw) == "Key: the slope is $m = \\frac{2}{3}$ — see link"

    def test_option_label_stripped(self):
        assert to_plain_text("A) **500**", strip_option_label=True) == "500"
        assert to_plain_text("(b) x = 2", strip_option_label=True) == "x = 2"
        assert to_plain_text("Always", strip_option_label=True) == "Always"

    def test_subscripts_untouched(self):
        assert to_plain_text("x_1 and y_2 are *points*") == "x_1 and y_2 are points"

    def test_single_line(self):
        assert to_plain_text("- one\n- two", single_line=True) == "one two"


class TestSanitizeTree:
    def test_plain_keys_vs_markdown_keys(self):
        payload = {
            "question": "What is **x**?",
            "options": ["**A**. 2", "B. *3*"],
            "explanation": "Because \\(x=2\\)\\n- step",
            "hints": ["use **PEMDAS**"],
            "id": "**q1**",
            "nested": {"title": "## T", "content": "<think>x</think>body"},
        }
        out = sanitize_tree(payload)
        assert out["question"] == "What is **x**?"
        assert out["options"] == ["A. 2", "B. 3"]
        assert out["explanation"] == "Because $x=2$\n- step"
        assert out["hints"] == ["use **PEMDAS**"]
        assert out["id"] == "**q1**"
        assert out["nested"] == {"title": "T", "content": "body"}

    def test_non_string_leaves_untouched(self):
        assert sanitize_tree({"points": 3, "ok": True, "n": None}) == {"points": 3, "ok": True, "n": None}
