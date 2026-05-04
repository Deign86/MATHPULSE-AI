"""
Updated curriculum RAG with exact match retrieval and 7-section notebook output.
"""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple


def _to_where(
    subject: Optional[str] = None,
    quarter: Optional[int] = None,
    content_domain: Optional[str] = None,
    chunk_type: Optional[str] = None,
    module_id: Optional[str] = None,
    lesson_id: Optional[str] = None,
    competency_code: Optional[str] = None,
    storage_path: Optional[str] = None,
) -> Optional[Dict[str, object]]:
    clauses = []
    if subject:
        clauses.append({"subject": {"$eq": subject}})
    if quarter is not None:
        clauses.append({"quarter": {"$eq": int(quarter)}})
    if content_domain:
        clauses.append({"content_domain": {"$eq": content_domain}})
    if chunk_type:
        clauses.append({"chunk_type": {"$eq": chunk_type}})
    if module_id:
        clauses.append({"module_id": {"$eq": module_id}})
    if lesson_id:
        clauses.append({"lesson_id": {"$eq": lesson_id}})
    if competency_code:
        clauses.append({"competency_code": {"$eq": competency_code}})
    if storage_path:
        clauses.append({"storage_path": {"$eq": storage_path}})
    if not clauses:
        return None
    if len(clauses) == 1:
        return clauses[0]
    return {"$and": clauses}


def _distance_to_score(distance: float) -> float:
    return round(1.0 / (1.0 + max(distance, 0.0)), 4)


def retrieve_curriculum_context(
    query: str,
    subject: str | None = None,
    quarter: int | None = None,
    content_domain: str | None = None,
    chunk_type: str | None = None,
    module_id: str | None = None,
    lesson_id: str | None = None,
    competency_code: str | None = None,
    storage_path: str | None = None,
    top_k: int = 8,
) -> list[dict]:
    from rag.vectorstore_loader import get_vectorstore_components

    _, collection, embedder = get_vectorstore_components()
    where = _to_where(subject, quarter, content_domain, chunk_type, module_id, lesson_id, competency_code, storage_path)

    prefixed_query = f"Represent this sentence for searching relevant passages: {query}"
    query_embedding = embedder.encode(
        prefixed_query,
        normalize_embeddings=True,
    ).tolist()

    result = collection.query(
        query_embeddings=[query_embedding],
        n_results=max(1, top_k),
        where=where,
        include=["documents", "metadatas", "distances"],
    )

    documents = (result.get("documents") or [[]])[0]
    metadatas = (result.get("metadatas") or [[]])[0]
    distances = (result.get("distances") or [[]])[0]

    rows: List[dict] = []
    for idx, content in enumerate(documents):
        md = metadatas[idx] if idx < len(metadatas) and isinstance(metadatas[idx], dict) else {}
        distance = float(distances[idx]) if idx < len(distances) else 1.0
        rows.append({
            "content": str(content or ""),
            "subject": str(md.get("subject") or "unknown"),
            "quarter": int(md.get("quarter") or 0),
            "content_domain": str(md.get("content_domain") or "general"),
            "chunk_type": str(md.get("chunk_type") or "concept"),
            "source_file": str(md.get("source_file") or ""),
            "storage_path": str(md.get("storage_path") or ""),
            "module_id": str(md.get("module_id") or ""),
            "lesson_id": str(md.get("lesson_id") or ""),
            "competency_code": str(md.get("competency_code") or ""),
            "page": int(md.get("page") or 0),
            "score": _distance_to_score(distance),
        })
    return rows


def build_exact_lesson_query(
    topic: str,
    subject: str,
    quarter: int,
    lesson_title: str | None = None,
    competency: str | None = None,
    module_unit: str | None = None,
    learner_level: str | None = None,
    competency_code: str | None = None,
) -> str:
    parts = [topic, subject, f"Quarter {quarter}"]
    for value in (lesson_title, competency, module_unit, learner_level, competency_code):
        clean = str(value or "").strip()
        if clean:
            parts.append(clean)
    return " | ".join(parts)


def build_lesson_query(
    topic: str,
    subject: str,
    quarter: int,
    *,
    lesson_title: Optional[str] = None,
    competency: Optional[str] = None,
    module_unit: Optional[str] = None,
    learner_level: Optional[str] = None,
) -> str:
    parts = [topic, subject, f"Quarter {quarter}"]
    for value in (lesson_title, competency, module_unit, learner_level):
        clean_value = str(value or "").strip()
        if clean_value:
            parts.append(clean_value)
    return " | ".join(parts)


def retrieve_lesson_pdf_context(
    topic: str,
    subject: str,
    quarter: int,
    lesson_title: str | None = None,
    competency: str | None = None,
    module_id: str | None = None,
    lesson_id: str | None = None,
    competency_code: str | None = None,
    storage_path: str | None = None,
    top_k: int = 8,
) -> Tuple[list[dict], str]:
    """Retrieve chunks by storage_path exact match + semantic ranking; fallback to general query."""
    if storage_path:
        exact_chunks = retrieve_curriculum_context(
            query=topic,
            subject=subject,
            quarter=quarter,
            storage_path=storage_path,
            top_k=top_k,
        )
        if exact_chunks and any(c["score"] >= 0.65 for c in exact_chunks):
            return exact_chunks, "exact"

    general_chunks = retrieve_curriculum_context(
        query=topic,
        subject=subject,
        quarter=quarter,
        top_k=top_k,
    )

    if storage_path and exact_chunks:
        all_chunks = exact_chunks + general_chunks
        seen = set()
        deduped = []
        for c in all_chunks:
            key = f"{c.get('source_file')}:{c.get('page')}:{c.get('content', '')[:60]}"
            if key not in seen:
                seen.add(key)
                deduped.append(c)
        deduped.sort(key=lambda x: x.get("score", 0), reverse=True)
        return deduped[:top_k], "hybrid"

    return general_chunks, "general"


def format_retrieved_chunks(curriculum_chunks: list[dict]) -> str:
    refs = []
    for i, chunk in enumerate(curriculum_chunks, start=1):
        refs.append(
            f"{i}. [{chunk.get('source_file')} p.{chunk.get('page')}] "
            f"({chunk.get('content_domain')}/{chunk.get('chunk_type')}) score={chunk.get('score')}\n"
            f"   Excerpt: {chunk.get('content', '')}"
        )
    return "\n".join(refs) if refs else "No curriculum context retrieved."


def summarize_retrieval_confidence(curriculum_chunks: list[dict]) -> Dict[str, any]:
    if not curriculum_chunks:
        return {"confidence": 0.0, "band": "low", "chunkCount": 0}

    top_scores = [float(c.get("score") or 0.0) for c in curriculum_chunks[:5]]
    score = sum(top_scores) / max(1, len(top_scores))
    band = "high" if score >= 0.72 else "medium" if score >= 0.5 else "low"
    return {"confidence": round(score, 3), "band": band, "chunkCount": len(curriculum_chunks)}


def organize_chunks_by_section(chunks: list[dict]) -> Dict[str, List[dict]]:
    """Organize retrieved chunks into lesson section categories."""
    sections: Dict[str, List[dict]] = {
        "introduction": [],
        "key_concepts": [],
        "worked_examples": [],
        "important_notes": [],
        "practice": [],
        "summary": [],
        "assessment": [],
        "general": [],
    }
    domain_priority = {
        "introduction": 1, "key_concepts": 2, "worked_examples": 3,
        "important_notes": 4, "practice": 5, "summary": 6,
        "assessment": 7, "general": 8,
    }
    for chunk in chunks:
        domain = chunk.get("content_domain", "general")
        if domain in sections:
            sections[domain].append(chunk)
        else:
            sections["general"].append(chunk)
    return sections


def build_lesson_prompt(
    *,
    lesson_title: str,
    competency: str,
    grade_level: str,
    subject: str,
    quarter: int,
    learner_level: Optional[str],
    module_unit: Optional[str],
    curriculum_chunks: list[dict],
    competency_code: Optional[str] = None,
) -> str:
    refs_text = format_retrieved_chunks(curriculum_chunks)
    organized = organize_chunks_by_section(curriculum_chunks)

    return (
        "You are a DepEd-aligned Grade 11-12 mathematics instructional designer.\n"
        "Generate a lesson in JSON format. Use ONLY the retrieved curriculum evidence below.\n"
        "Do NOT invent content. Do NOT add generic motivational text. All content must be grounded in the retrieved excerpts.\n\n"
        f"Lesson title: {lesson_title}\n"
        f"Competency code: {competency_code or 'n/a'}\n"
        f"Curriculum competency: {competency}\n"
        f"Grade level: {grade_level}\n"
        f"Subject: {subject}\n"
        f"Quarter: Q{quarter}\n"
        f"Learner level: {learner_level or 'Grade 11-12'}\n"
        f"Module/unit: {module_unit or 'n/a'}\n\n"
        "[CURRICULUM CONTEXT]\n"
        f"{refs_text}\n\n"
        "Return ONLY valid JSON with this exact structure. All 7 sections are required:\n"
        "{\n"
        '  "sections": [\n'
        '    {"type": "introduction",    "title": "Introduction",       "content": "..."},\n'
        '    {"type": "key_concepts",    "title": "Key Concepts",      "content": "...", "callouts": [{"type":"important|ti..."}]\n},'
        '    {"type": "video",           "title": "Video Lesson",      "content": "...", "videoId": "", "videoTitle": "", "videoChannel": "", "embedUrl": "", "thumbnailUrl": ""},\n'
        '    {"type": "worked_examples",  "title": "Worked Examples",    "examples": [{"problem":"...","steps":["Step 1: ...","Step 2: ..."],"answer":"..."}]},\n'
        '    {"type": "important_notes",  "title": "Important Notes",   "bulletPoints": ["...","..."]},\n'
        '    {"type": "try_it_yourself", "title": "Try It Yourself",   "practiceProblems": [{"question":"...","solution":"..."}]},\n'
        '    {"type": "summary",         "title": "Summary",           "content": "..."}\n'
        "  ],\n"
        '  "needsReview": false\n'
        "}\n\n"
        "Rules:\n"
        "- content in introduction, key_concepts, important_notes, summary: use paragraph/bullet text grounded in retrieved chunks\n"
        "- examples must reflect actual content from the retrieved curriculum (real formulas, real contexts)\n"
        "- practiceProblems should be derivable from worked examples\n"
        "- callouts: type is 'important', 'tip', or 'warning'\n"
        "- video section: content is a brief sentence, leave videoId empty (will be filled by backend)\n"
        "- Do not use placeholder text like 'placeholder' or 'example text'\n"
        "- Do not fabricate worked examples - use actual curriculum content\n"
    )


def build_problem_generation_prompt(topic: str, difficulty: str, curriculum_chunks: list[dict]) -> str:
    refs = []
    for i, chunk in enumerate(curriculum_chunks, start=1):
        refs.append(
            f"{i}. [{chunk.get('source_file')} p.{chunk.get('page')}] "
            f"({chunk.get('content_domain')}/{chunk.get('chunk_type')}) {chunk.get('content', '')}"
        )
    refs_text = "\n".join(refs) if refs else "No curriculum context retrieved."

    return (
        "Generate one practice problem strictly aligned to the retrieved DepEd competency scope.\n"
        "Do not include topics outside the competency context.\n\n"
        f"Topic: {topic}\n"
        f"Difficulty: {difficulty}\n\n"
        "[CURRICULUM CONTEXT]\n"
        f"{refs_text}\n\n"
        "Return JSON with keys: problem, solution, competencyReference"
    )


def build_analysis_curriculum_context(weak_topics: list[str], subject: str) -> list[dict]:
    dedup: Dict[str, dict] = {}
    for weak_topic in weak_topics:
        rows = retrieve_curriculum_context(
            query=f"DepEd learning competency for {weak_topic}",
            subject=subject,
            chunk_type="learning_competency",
            top_k=2,
        )
        for row in rows:
            key = f"{row.get('source_file')}::{row.get('page')}::{row.get('content', '')[:80]}"
            if key not in dedup:
                dedup[key] = row
    return list(dedup.values())