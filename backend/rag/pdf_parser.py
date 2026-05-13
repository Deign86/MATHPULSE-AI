import pdfplumber
from io import BytesIO
import logging

logger = logging.getLogger(__name__)

def parse_pdf_layout(content: bytes):
    """
    Extract text and tables using pdfplumber while preserving layout.
    Preserves Filipino/English (Taglish) content as-is.
    """
    try:
        results = []
        with pdfplumber.open(BytesIO(content)) as pdf:
            for i, page in enumerate(pdf.pages):
                text = page.extract_text()
                tables = page.extract_tables()
                
                # Flatten tables into Markdown-like grid strings for better semantic grouping
                formatted_tables = []
                for table in tables:
                    if not table:
                        continue
                    rows = [" | ".join([str(cell).strip() if cell else "" for cell in row]) for row in table]
                    formatted_tables.append("\n".join(rows))
                
                results.append({
                    "page_number": i + 1,
                    "text": text or "",
                    "tables": formatted_tables
                })
        return results
    except Exception as e:
        logger.error(f"Error parsing PDF: {e}")
        raise
