from docx import Document
from io import BytesIO
import logging

logger = logging.getLogger(__name__)

def parse_docx_structure(content: bytes):
    """
    Extract headings and paragraphs from DOCX while preserving hierarchy.
    Preserves Filipino/English (Taglish) content as-is.
    """
    try:
        doc = Document(BytesIO(content))
        elements = []
        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue
                
            # Basic style detection for headings
            style_name = para.style.name
            is_heading = any(h in style_name for h in ['Heading', 'Title', 'Heading 1', 'Heading 2', 'Heading 3'])
            
            elements.append({
                "text": text,
                "style": style_name,
                "is_heading": is_heading,
                "metadata": {
                    "bold": any(run.bold for run in para.runs),
                    "italic": any(run.italic for run in para.runs)
                }
            })
            
        return elements
    except Exception as e:
        logger.error(f"Error parsing DOCX: {e}")
        raise
