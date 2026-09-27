from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from backend.rag.liteparse_utils import extract_text
from scripts.ingest_curriculum import discover_curriculum_files, infer_metadata


def test_extract_text_uses_liteparse_result_text():
    fake_module = SimpleNamespace(LiteParse=lambda **_: SimpleNamespace(parse=lambda _: SimpleNamespace(text="parsed module")))
    with patch.dict("sys.modules", {"liteparse": fake_module}):
        assert extract_text(b"pdf bytes") == "parsed module"


def test_discovery_prefers_markdown_over_matching_pdf(tmp_path: Path):
    markdown = tmp_path / "General Mathematics" / "Quarter 1" / "Parsed Markdown" / "Lesson.md"
    pdf = tmp_path / "General Mathematics" / "Quarter 1" / "PDF" / "Lesson.pdf"
    other_pdf = tmp_path / "Finite Mathematics" / "Finite Math 1" / "PDF" / "Other.pdf"
    markdown.parent.mkdir(parents=True)
    pdf.parent.mkdir(parents=True)
    other_pdf.parent.mkdir(parents=True)
    markdown.write_text("content", encoding="utf-8")
    pdf.write_bytes(b"pdf")
    other_pdf.write_bytes(b"pdf")

    files = discover_curriculum_files(tmp_path)

    readme = tmp_path / "README.md"
    readme.write_text("metadata", encoding="utf-8")

    files = discover_curriculum_files(tmp_path)

    assert markdown in files
    assert pdf not in files
    assert other_pdf in files
    assert readme not in files
    assert infer_metadata(markdown)["subject"] == "general_mathematics"
    assert infer_metadata(markdown)["quarter"] == 1


def test_discovery_excludes_corpus_readme(tmp_path: Path):
    readme = tmp_path / "README.md"
    readme.write_text("metadata", encoding="utf-8")

    assert discover_curriculum_files(tmp_path) == []
