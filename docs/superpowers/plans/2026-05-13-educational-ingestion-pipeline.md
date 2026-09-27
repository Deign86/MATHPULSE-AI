# Educational Content Ingestion Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready educational content ingestion pipeline for PDF/DOCX files using FastAPI, featuring layout-aware parsing and DeepSeek-driven semantic segmentation.

**Architecture:** A three-stage pipeline (Deduplication -> Structural Parsing -> Semantic Segmentation) that processes uploaded files, extracts pedagogical structure, and indexes deduplicated chunks into Firestore/Vectorstore.

**Tech Stack:** FastAPI, pdfplumber, python-docx, DeepSeek API (Sole AI Provider), Firestore.

---

### Task 1: Deduplication Layer

**Files:**
- Create: `backend/utils/hash_utils.py`
- Test: `backend/tests/test_hash_utils.py`

- [ ] **Step 1: Write hashing utility**

```python
import hashlib

def calculate_file_hash(content: bytes) -> str:
    """Calculate SHA-256 hash of file content."""
    return hashlib.sha256(content).hexdigest()
```

- [ ] **Step 2: Write tests for hashing**

```python
import pytest
from backend.utils.hash_utils import calculate_file_hash

def test_calculate_file_hash_consistency():
    content = b"test educational content"
    hash1 = calculate_file_hash(content)
    hash2 = calculate_file_hash(content)
    assert hash1 == hash2
    assert len(hash1) == 64

def test_calculate_file_hash_uniqueness():
    assert calculate_file_hash(b"content a") != calculate_file_hash(b"content b")
```

- [ ] **Step 3: Run tests**

Run: `pytest backend/tests/test_hash_utils.py`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/utils/hash_utils.py backend/tests/test_hash_utils.py
git commit -m "feat(ingestion): add SHA-256 file hashing for deduplication"
```

### Task 2: DOCX Structural Parser

**Files:**
- Create: `backend/rag/docx_parser.py`
- Test: `backend/tests/test_docx_parser.py`

- [ ] **Step 1: Implement structural parser**

```python
from docx import Document
from io import BytesIO

def parse_docx_structure(content: bytes):
    """Extract headings and paragraphs from DOCX while preserving hierarchy."""
    doc = Document(BytesIO(content))
    elements = []
    for para in doc.paragraphs:
        if para.text.strip():
            elements.append({
                "text": para.text,
                "style": para.style.name,
                "is_heading": para.style.name.startswith('Heading')
            })
    return elements
```

- [ ] **Step 2: Write structural tests**

```python
from backend.rag.docx_parser import parse_docx_structure

def test_parse_docx_headings():
    # Mocking docx is complex, use a tiny real doc if available or mock Document
    pass 
```

- [ ] **Step 3: Commit**

```bash
git add backend/rag/docx_parser.py
git commit -m "feat(ingestion): implement basic DOCX structural parser"
```

### Task 3: PDF Layout-Aware Parser

**Files:**
- Create: `backend/rag/pdf_parser.py`

- [ ] **Step 1: Implement PDF parser with pdfplumber**

```python
import pdfplumber
from io import BytesIO

def parse_pdf_layout(content: bytes):
    """Extract text and tables using pdfplumber."""
    results = []
    with pdfplumber.open(BytesIO(content)) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            tables = page.extract_tables()
            results.append({"text": text, "tables": tables})
    return results
```

- [ ] **Step 2: Commit**

```bash
git add backend/rag/pdf_parser.py
git commit -m "feat(ingestion): implement layout-aware PDF parser"
```

### Task 4: Semantic Segmentation Service

**Files:**
- Create: `backend/services/segmentation_service.py`

- [ ] **Step 1: Implement DeepSeek segmenter**

```python
from backend.services.inference_client import call_hf_chat_async

async def segment_content(text: str):
    prompt = f"Segment the following Filipino SHS STEM educational text into pedagogical chunks (Objectives, Lesson, Practice). Text: {text}"
    # This must use the DeepSeek-only routing logic
    return await call_hf_chat_async(prompt)
```

- [ ] **Step 2: Commit**

```bash
git add backend/services/segmentation_service.py
git commit -m "feat(ingestion): add DeepSeek semantic segmentation service"
```

### Task 5: FastAPI Ingestion Endpoint

**Files:**
- Modify: `backend/main.py`

- [ ] **Step 1: Add /api/materials/ingest endpoint**

```python
@app.post("/api/materials/ingest")
async def ingest_material(file: UploadFile = File(...)):
    content = await file.read()
    file_hash = calculate_file_hash(content)
    # Check deduplication in Firestore
    # Route to parser based on extension
    # Run segmentation
    # Store chunks
    return {"status": "success", "hash": file_hash}
```

- [ ] **Step 2: Commit**

```bash
git add backend/main.py
git commit -m "feat(ingestion): integrate pipeline into FastAPI endpoint"
```
