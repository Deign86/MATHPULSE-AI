from __future__ import annotations

from typing import Dict, List, Optional

from .vectorstore_loader import get_vectorstore_components


def _to_where(
    subject: Optional[str] = None,
    quarter: Optional[int] = None,
    content_domain: Optional[str] = None,
    chunk_type: Optional[str] = None,
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
    if not clauses:
        return None
    if len(clauses) == 1:
        return clauses[0]
    return {"$and": clauses}


def _distance_to_score(distance: float) -> float:
    # Chroma returns smaller distance for better matches. Map to (0,1].
    return round(1.0 / (1.0 + max(distance, 0.0)), 4)


def retrieve_curriculum_context(
    query: str,
    subject: str | None = None,
    quarter: int | None = None,
    content_domain: str | None = None,
    chunk_type: str | None = None,
    top_k: int = 5,
) -> list[dict]:
    _, collection, embedder = get_vectorstore_components()
    where = _to_where(subject, quarter, content_domain, chunk_type)

    query_embedding = embedder.encode(query).tolist()
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
        rows.append(
            {
                "content": str(content or ""),
                "subject": str(md.get("subject") or "unknown"),
                "quarter": int(md.get("quarter") or 0),
                "content_domain": str(md.get("content_domain") or "unknown"),
                "chunk_type": str(md.get("chunk_type") or "unknown"),
                "source_file": str(md.get("source_file") or ""),
                "page": int(md.get("page") or 0),
                "score": _distance_to_score(distance),
            }
        )

    return rows


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


def format_retrieved_chunks(curriculum_chunks: list[dict]) -> str:
    references = []
    for i, chunk in enumerate(curriculum_chunks, start=1):
        references.append(
            f"{i}. [{chunk.get('source_file')} p.{chunk.get('page')}] "
            f"({chunk.get('content_domain')}/{chunk.get('chunk_type')}) score={chunk.get('score')}\n"
            f"   Excerpt: {chunk.get('content', '')}"
        )
    return "\n".join(references) if references else "No curriculum context retrieved."


def summarize_retrieval_confidence(curriculum_chunks: list[dict]) -> Dict[str, float | str]:
    if not curriculum_chunks:
        return {"confidence": 0.0, "band": "low"}

    top_scores = [float(chunk.get("score") or 0.0) for chunk in curriculum_chunks[:5]]
    score = sum(top_scores) / max(1, len(top_scores))
    if score >= 0.72:
        band = "high"
    elif score >= 0.5:
        band = "medium"
    else:
        band = "low"
    return {"confidence": round(score, 3), "band": band}


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
) -> str:
    refs_text = format_retrieved_chunks(curriculum_chunks)
    return (
        "You are a Grade 11-12 DepEd SHS math instructional designer.\n"
        "Generate JSON only. Use ONLY the retrieved curriculum evidence below. Do not invent competencies or content beyond the retrieved scope.\n\n"
        f"Lesson title: {lesson_title}\n"
        f"Curriculum competency: {competency}\n"
        f"Grade level: {grade_level}\n"
        f"Subject: {subject}\n"
        f"Quarter: Q{quarter}\n"
        f"Learner level: {learner_level or 'mixed'}\n"
        f"Module/unit: {module_unit or 'n/a'}\n\n"
        "[CURRICULUM CONTEXT]\n"
        f"{refs_text}\n\n"
        "Return JSON with these keys only:\n"
        "lessonTitle, curriculumCompetency, lessonObjective, realWorldHook, explanation, workedExample, guidedPractice, independentPractice, quickAssessment, reflectionPrompt, sourceCitations, needsReview, reviewReason\n\n"
        "Rules:\n"
        "- Keep the lesson age-appropriate for SHS learners.\n"
        "- Use real Philippine contexts where possible, such as payroll, VAT, discounts, loans, logistics, travel, or school data.\n"
        "- If evidence is thin, set needsReview=true and explain why in reviewReason.\n"
        "- Do not mention unsupported curriculum facts.\n"
        "- sourceCitations should be an array of short citations referencing the retrieved excerpts."
    )


def build_problem_generation_prompt(topic: str, difficulty: str, curriculum_chunks: list[dict]) -> str:
    references = []
    for i, chunk in enumerate(curriculum_chunks, start=1):
        references.append(
            f"{i}. [{chunk.get('source_file')} p.{chunk.get('page')}] "
            f"({chunk.get('content_domain')}/{chunk.get('chunk_type')}) {chunk.get('content', '')}"
        )
    refs_text = "\n".join(references) if references else "No curriculum context retrieved."

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
            key = f"{row.get('source_file')}::{row.get('page')}::{row.get('content')[:80]}"
            if key not in dedup:
                dedup[key] = row
    return list(dedup.values())
