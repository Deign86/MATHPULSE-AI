"""Small LiteParse adapter shared by curriculum and upload ingestion paths."""
from __future__ import annotations

from pathlib import Path
from typing import Any


def parse_document(content: bytes | str | Path) -> Any:
    """Parse a document with LiteParse, accepting paths or in-memory bytes."""
    from liteparse import LiteParse

    return LiteParse(output_format="markdown").parse(content)


def extract_text(content: bytes | str | Path) -> str:
    """Return LiteParse's rendered text for a document."""
    text = getattr(parse_document(content), "text", "")
    return text if isinstance(text, str) else str(text or "")


def extract_text_and_pages(content: bytes | str | Path) -> tuple[str, list[int]]:
    """Return text and conservative page offsets for legacy chunking callers.

    LiteParse's stable Python contract exposes rendered document text. Page-level
    objects vary by parser output, so callers retain a single-document offset.
    """
    text = extract_text(content)
    return text, [0] if text else []
