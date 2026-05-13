import io
import logging
import os
from typing import List, Tuple, Optional
from pydantic import BaseModel
import pdfplumber
from docx import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Import embedding model loader (reusing existing mechanism)
from rag.vectorstore_loader import get_vectorstore_components

logger = logging.getLogger(__name__)

TEACHER_MATERIAL_MODULE_SYSTEM_PROMPT = """
You are the curriculum ingestion and lesson-design assistant inside MathPulse AI.
Your job is to read the raw text of teacher-provided course materials and structure it into a cohesive learning module.
Extract key concepts, definitions, formulas, and examples.
"""

class ContentExtraction(BaseModel):
    text: str
    outline: List[str]
    filename: str
    file_type: str

class Chunk(BaseModel):
    chunk_id: str
    text: str
    heading: Optional[str]
    chunk_index: int

def parse_pdf(file_bytes: bytes) -> Tuple[str, List[str]]:
    """Extract text and outline from a PDF file using pdfplumber."""
    text_content = []
    outline = []
    
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            # Try to get native outline/bookmarks
            if pdf.doc.catalog and 'Outlines' in pdf.doc.catalog:
                # Simplistic extraction of native outlines if available
                # Often outlines are complex nested dictionaries in pdfplumber, 
                # so we stick to basic text extraction for headings if this fails.
                pass
                
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    text_content.append(extracted)
                    
        full_text = "\n\n".join(text_content)
        # Fallback outline: we'll leave it empty unless we parse formatting.
        return full_text, outline
    except Exception as e:
        logger.error(f"Error parsing PDF: {e}")
        raise ValueError(f"Failed to parse PDF: {str(e)}")

def parse_docx(file_bytes: bytes) -> Tuple[str, List[str]]:
    """Extract text and outline from a DOCX file using python-docx."""
    text_content = []
    outline = []
    
    try:
        doc = Document(io.BytesIO(file_bytes))
        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue
            text_content.append(text)
            
            # Simple heading detection based on style name
            if para.style and para.style.name and any(h in para.style.name for h in ['Heading', 'Title']):
                outline.append(text)
                
        full_text = "\n\n".join(text_content)
        return full_text, outline
    except Exception as e:
        logger.error(f"Error parsing DOCX: {e}")
        raise ValueError(f"Failed to parse DOCX: {str(e)}")

def parse_txt(file_bytes: bytes) -> Tuple[str, List[str]]:
    """Extract text and outline from a TXT file."""
    try:
        text = file_bytes.decode('utf-8')
        # We don't have structural headings in generic txt files easily, so outline is empty
        return text, []
    except UnicodeDecodeError:
        try:
            # Fallback for common windows encodings
            text = file_bytes.decode('latin-1')
            return text, []
        except Exception as e:
            logger.error(f"Error parsing TXT: {e}")
            raise ValueError(f"Failed to parse TXT: {str(e)}")

def extract_content(file_bytes: bytes, filename: str) -> ContentExtraction:
    """Route to correct parser based on file extension."""
    ext = filename.split('.')[-1].lower() if '.' in filename else ''
    
    if ext == 'pdf':
        text, outline = parse_pdf(file_bytes)
        file_type = 'pdf'
    elif ext in ['doc', 'docx']:
        text, outline = parse_docx(file_bytes)
        file_type = 'docx'
    elif ext == 'txt':
        text, outline = parse_txt(file_bytes)
        file_type = 'txt'
    else:
        raise ValueError(f"Unsupported file extension: {ext}")
        
    return ContentExtraction(
        text=text,
        outline=outline,
        filename=filename,
        file_type=file_type
    )

def chunk_text(text: str, outline: List[str], chunk_size: int = 500) -> List[Chunk]:
    """Split text into chunks, preserving context and headings if possible."""
    # Using LangChain's RecursiveCharacterTextSplitter for robust chunking
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=int(chunk_size * 0.1), # 10% overlap
        separators=["\n\n", "\n", " ", ""]
    )
    
    raw_chunks = splitter.split_text(text)
    
    chunks = []
    current_heading = None
    
    for i, raw_chunk in enumerate(raw_chunks):
        # Naive heading matching: if the chunk contains a known heading, update current_heading
        # In a more advanced implementation, we'd use MarkdownHeaderTextSplitter or similar.
        for h in outline:
            if h in raw_chunk:
                current_heading = h
                break
                
        chunks.append(Chunk(
            chunk_id=f"chunk_{i}",
            text=raw_chunk,
            heading=current_heading,
            chunk_index=i
        ))
        
    return chunks

def ingest_teacher_material(material_id: str, chunks: List[Chunk], metadata: dict) -> None:
    """Embed chunks and store in the teacher-materials vector index."""
    try:
        import chromadb
        from chromadb.config import Settings
        from sentence_transformers import SentenceTransformer
    except ImportError as e:
        logger.error(f"Missing required vector store dependencies: {e}")
        raise
        
    # Get vectorstore path, specifically using teacher_materials
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    persist_dir = os.path.join(base_dir, "datasets", "vectorstore", "teacher_materials")
    os.makedirs(persist_dir, exist_ok=True)
    
    client = chromadb.PersistentClient(path=persist_dir)
    collection = client.get_or_create_collection(name="teacher_materials")
    
    # We must explicitly initialize our embedding model since we are saving to a new collection
    embedder = SentenceTransformer("BAAI/bge-small-en-v1.5")
    
    documents = []
    embeddings = []
    metadatas = []
    ids = []
    
    for chunk in chunks:
        documents.append(chunk.text)
        
        # Prepare specific metadata for this chunk, overlaying general material metadata
        chunk_meta = metadata.copy()
        chunk_meta.update({
            "chunk_index": chunk.chunk_index,
            "heading": chunk.heading or "",
            "material_id": material_id,
        })
        # Remove any None values from dict as chromadb doesn't accept them
        chunk_meta = {k: v for k, v in chunk_meta.items() if v is not None}
        metadatas.append(chunk_meta)
        
        ids.append(f"{material_id}_{chunk.chunk_id}")
        
    # Generate embeddings in batch
    if documents:
        # Generate embeddings
        embeddings_array = embedder.encode(documents, normalize_embeddings=True)
        embeddings = embeddings_array.tolist()
        
        # Upsert into Chroma
        collection.upsert(
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=ids
        )
        logger.info(f"Successfully ingested {len(chunks)} chunks for material {material_id}")

