"""Curriculum RAG package for DepEd-grounded retrieval utilities."""

from .curriculum_rag import (
    retrieve_curriculum_context,
    build_lesson_prompt,
    build_problem_generation_prompt,
    build_analysis_curriculum_context,
)

__all__ = [
    "retrieve_curriculum_context",
    "build_lesson_prompt",
    "build_problem_generation_prompt",
    "build_analysis_curriculum_context",
]
