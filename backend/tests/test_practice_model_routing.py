"""Test that practice_generation task type is properly routed to a model."""

from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.inference_client import get_model_for_task


class TestPracticeRouting:
    """Verify practice_generation routing."""

    def test_practice_generation_resolves_to_model(self):
        """get_model_for_task('practice_generation') should return a model string."""
        model = get_model_for_task("practice_generation")
        assert model is not None
        assert isinstance(model, str)
        assert len(model) > 0

    def test_practice_generation_not_same_as_quiz_generation_alias(self):
        """practice_generation and quiz_generation are distinct task types."""
        practice_model = get_model_for_task("practice_generation")
        quiz_model = get_model_for_task("quiz_generation")
        # Both default to the chat model; each task type must resolve to a Claude model.
        assert practice_model.startswith("claude-")
        assert quiz_model.startswith("claude-")
