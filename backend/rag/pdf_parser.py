import logging

from .liteparse_utils import extract_text

logger = logging.getLogger(__name__)


def parse_pdf_layout(content: bytes):
    """Extract LiteParse text while preserving the legacy page-row contract."""
    try:
        text = extract_text(content)
        return [{"page_number": 1, "text": text, "tables": []}] if text else []
    except Exception as error:
        logger.error("Error parsing PDF: %s", error)
        raise
