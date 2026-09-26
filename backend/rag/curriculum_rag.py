"""
Updated curriculum RAG with exact match retrieval and 7-section notebook output.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

# Canonical retrieval-row keys: content, subject, quarter, content_domain,
# chunk_type, source_file, storage_path, module_id, lesson_id,
# competency_code, page, score. Plain-dict alias (not TypedDict) so existing
# List[Dict[str, Any]] consumers keep typechecking (list invariance).
# ponytail: upgrade to TypedDict when callers move off Dict[str, Any].
CurriculumChunk = Dict[str, Any]


def _normalize_subject(subject: Optional[str]) -> Optional[str]:
    if not subject:
        return None
    raw = subject.strip().lower().replace("-", "_").replace(" ", "_")
    clean_raw = re.sub(r"problems?", "", raw)
    if "stat" in clean_raw or "prob" in clean_raw or "statistics" in clean_raw:
        return "statistics_and_probability"
    if "gen" in raw or "general" in raw:
        return "general_mathematics"
    if "finite" in raw and "1" in raw:
        return "finite_mathematics_1"
    if "finite" in raw and "2" in raw:
        return "finite_mathematics_2"
    return raw


def _normalize_storage_candidates(storage_path: Optional[str]) -> Tuple[List[str], List[str]]:
    """Return candidate (storage_paths, filenames) for exact-match retrieval."""
    if not storage_path:
        return [], []
    clean = storage_path.replace("\\", "/").strip("/")
    if clean.startswith("gs://"):
        parts_gs = clean.split("/", 2)
        if len(parts_gs) > 2:
            clean = parts_gs[2]

    name = clean.split("/")[-1]
    stem = name.rsplit(".", 1)[0] if "." in name else name

    candidate_files = [name]
    if f"{stem}.pdf" not in candidate_files:
        candidate_files.append(f"{stem}.pdf")
    if f"{stem}.md" not in candidate_files:
        candidate_files.append(f"{stem}.md")

    candidate_paths = [clean]
    if not clean.startswith("curriculum/"):
        candidate_paths.append(f"curriculum/{clean}")
    else:
        candidate_paths.append(clean[len("curriculum/"):])

    extended_paths = []
    for p in candidate_paths:
        extended_paths.append(p)
        if p.endswith(".pdf"):
            extended_paths.append(p[:-4] + ".md")
            extended_paths.append(p.replace("/PDF/", "/Parsed Markdown/")[:-4] + ".md")
        elif p.endswith(".md"):
            extended_paths.append(p[:-3] + ".pdf")
            extended_paths.append(p.replace("/Parsed Markdown/", "/PDF/")[:-3] + ".pdf")

    cand_paths_deduped = list(dict.fromkeys(extended_paths))
    cand_files_deduped = list(dict.fromkeys(candidate_files))
    return cand_paths_deduped, cand_files_deduped


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
        norm = _normalize_subject(subject)
        candidates = [subject]
        if norm:
            candidates.append(norm)
        if norm == "statistics_and_probability":
            candidates.extend(["statistics_and_probability", "stat_prob", "statistics", "probability", "statistics and probability"])
        elif norm == "general_mathematics":
            candidates.extend(["general_mathematics", "general_math", "general mathematics"])
        deduped = list(dict.fromkeys([c for c in candidates if c]))
        if len(deduped) > 1:
            clauses.append({"subject": {"$in": deduped}})
        elif len(deduped) == 1:
            clauses.append({"subject": {"$eq": deduped[0]}})
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
        cand_paths, cand_files = _normalize_storage_candidates(storage_path)
        clauses.append({
            "$or": [
                {"storage_path": {"$in": cand_paths}},
                {"source_file": {"$in": cand_files}},
            ]
        })
    if not clauses:
        return None
    if len(clauses) == 1:
        return clauses[0]
    return {"$and": clauses}


def _distance_to_score(distance: float) -> float:
    return round(1.0 / (1.0 + max(distance, 0.0)), 4)


def _cosine_distance(vec_a: List[float], vec_b: List[float]) -> float:
    """Cosine distance (1 - cosine similarity) between two embedding vectors."""
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = sum(a * a for a in vec_a) ** 0.5
    norm_b = sum(b * b for b in vec_b) ** 0.5
    if norm_a <= 0.0 or norm_b <= 0.0:
        return 1.0
    return max(0.0, 1.0 - dot / (norm_a * norm_b))


def _meta_quarter(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def _subject_filter_values(subject: Optional[str]) -> List[str]:
    """Allowed stored `subject` values for a requested subject (mirrors _to_where)."""
    if not subject:
        return []
    norm = _normalize_subject(subject)
    candidates = [subject]
    if norm:
        candidates.append(norm)
    if norm == "statistics_and_probability":
        candidates.extend(["statistics_and_probability", "stat_prob", "statistics", "probability", "statistics and probability"])
    elif norm == "general_mathematics":
        candidates.extend(["general_mathematics", "general_math", "general mathematics"])
    return list(dict.fromkeys([c for c in candidates if c]))


def _metadata_matches(
    md: Dict[str, Any],
    subject: Optional[str] = None,
    quarter: Optional[int] = None,
    content_domain: Optional[str] = None,
    chunk_type: Optional[str] = None,
    module_id: Optional[str] = None,
    lesson_id: Optional[str] = None,
    competency_code: Optional[str] = None,
    storage_path: Optional[str] = None,
) -> bool:
    """Python-side equivalent of _to_where for post-query filtering (issue #160)."""
    if subject:
        if str(md.get("subject") or "") not in _subject_filter_values(subject):
            return False
    if quarter is not None:
        if _meta_quarter(md.get("quarter")) != int(quarter):
            return False
    if content_domain:
        if str(md.get("content_domain") or "") != content_domain:
            return False
    if chunk_type:
        if str(md.get("chunk_type") or "") != chunk_type:
            return False
    if module_id:
        if str(md.get("module_id") or "") != module_id:
            return False
    if lesson_id:
        if str(md.get("lesson_id") or "") != lesson_id:
            return False
    if competency_code:
        if str(md.get("competency_code") or "") != competency_code:
            return False
    if storage_path:
        cand_paths, cand_files = _normalize_storage_candidates(storage_path)
        if str(md.get("storage_path") or "") not in cand_paths and str(md.get("source_file") or "") not in cand_files:
            return False
    return True


def _row_from_chunk(
    content: Any,
    md: Dict[str, Any],
    distance: float,
    storage_path: Optional[str] = None,
) -> CurriculumChunk:
    ret_storage = str(md.get("storage_path") or "").strip()
    ret_source_file = str(md.get("source_file") or "").strip()
    ret_source_path = str(md.get("source_path") or "").strip()

    if not ret_storage:
        if ret_source_path:
            norm_sp = ret_source_path.replace("\\", "/")
            if "curriculum/" in norm_sp:
                ret_storage = "curriculum/" + norm_sp.split("curriculum/", 1)[1]
        if not ret_storage and storage_path:
            norm_sp = storage_path.replace("\\", "/").strip("/")
            ret_storage = norm_sp if norm_sp.startswith("curriculum/") else f"curriculum/{norm_sp}"
        if not ret_storage and ret_source_file:
            ret_storage = f"curriculum/{ret_source_file}"

    if not ret_source_file:
        if ret_storage:
            ret_source_file = ret_storage.split("/")[-1]
        elif ret_source_path:
            ret_source_file = ret_source_path.replace("\\", "/").split("/")[-1]

    raw_page = md.get("page")
    if raw_page is not None and str(raw_page).isdigit() and int(raw_page) > 0:
        page = int(raw_page)
    else:
        raw_chunk = md.get("chunk_index")
        if raw_chunk is not None and str(raw_chunk).isdigit() and int(raw_chunk) > 0:
            page = int(raw_chunk)
        else:
            page = 1

    return {
        "content": str(content or ""),
        "subject": str(md.get("subject") or "unknown"),
        "quarter": _meta_quarter(md.get("quarter")),
        "content_domain": str(md.get("content_domain") or "general"),
        "chunk_type": str(md.get("chunk_type") or "concept"),
        "source_file": ret_source_file,
        "storage_path": ret_storage,
        "module_id": str(md.get("module_id") or ""),
        "lesson_id": str(md.get("lesson_id") or ""),
        "competency_code": str(md.get("competency_code") or ""),
        "page": page,
        "score": _distance_to_score(distance),
    }


def _query_embeddings_with_fallback(
    collection: Any,
    embedder: Any,
    prefixed_query: str,
    n_results: int,
) -> Tuple[Any, Any, List[float]]:
    """Run an unfiltered vector query, retrying once on embedding-dimension mismatch."""
    query_embedding = embedder.encode(
        prefixed_query,
        normalize_embeddings=True,
    ).tolist()
    try:
        result = collection.query(
            query_embeddings=[query_embedding],
            n_results=max(1, n_results),
            include=["documents", "metadatas", "distances"],
        )
    except Exception as exc:
        err_msg = str(exc)
        if "dimension of" in err_msg:
            match = re.search(r"dimension of (\d+)", err_msg)
            expected_dim = int(match.group(1)) if match else 384
            fallback_model = "BAAI/bge-small-en-v1.5" if expected_dim == 384 else "BAAI/bge-base-en-v1.5"
            from rag.vectorstore_loader import get_vectorstore_components, reset_vectorstore_singleton
            reset_vectorstore_singleton()
            _, collection, embedder = get_vectorstore_components(model_name=fallback_model)
            query_embedding = embedder.encode(
                prefixed_query,
                normalize_embeddings=True,
            ).tolist()
            result = collection.query(
                query_embeddings=[query_embedding],
                n_results=max(1, n_results),
                include=["documents", "metadatas", "distances"],
            )
        else:
            raise
    return collection, result, query_embedding


def _retrieve_exact_file_chunks(
    collection: Any,
    embedder: Any,
    query_embedding: List[float],
    storage_path: str,
    subject: str | None,
    quarter: int | None,
    content_domain: str | None,
    chunk_type: str | None,
    module_id: str | None,
    lesson_id: str | None,
    competency_code: str | None,
    top_k: int,
) -> List[CurriculumChunk]:
    """Exact-match retrieval for one source file via collection.get (server-side
    metadata filtering works; only id-resolving vector reads are broken)."""
    cand_paths, cand_files = _normalize_storage_candidates(storage_path)
    payload = collection.get(
        where={
            "$or": [
                {"storage_path": {"$in": cand_paths}},
                {"source_file": {"$in": cand_files}},
            ]
        },
        include=["documents", "metadatas"],
    )
    ids = payload.get("ids") or []
    documents = payload.get("documents") or []
    metadatas = payload.get("metadatas") or []
    kept: List[Tuple[int, Dict[str, Any]]] = []
    for idx in range(len(ids)):
        md = metadatas[idx] if idx < len(metadatas) and isinstance(metadatas[idx], dict) else {}
        if not _metadata_matches(
            md,
            subject=subject,
            quarter=quarter,
            content_domain=content_domain,
            chunk_type=chunk_type,
            module_id=module_id,
            lesson_id=lesson_id,
            competency_code=competency_code,
            storage_path=storage_path,
        ):
            continue
        kept.append((idx, md))
    rows: List[CurriculumChunk] = []
    if kept:
        texts = [str(documents[idx]) if idx < len(documents) else "" for idx, _ in kept]
        try:
            vectors = embedder.encode(texts, normalize_embeddings=True).tolist()
        except Exception:
            vectors = [None] * len(texts)
        for (idx, md), text, vec in zip(kept, texts, vectors):
            try:
                distance = _cosine_distance(list(vec), query_embedding) if vec is not None else 1.0
            except (TypeError, ValueError):
                distance = 1.0
            rows.append(_row_from_chunk(text, md, distance, storage_path=storage_path))
    rows.sort(key=lambda row: row.get("score", 0.0), reverse=True)
    return rows[: max(1, top_k)]


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
    grade_level: str | None = None,
    **kwargs: Any,
) -> list[CurriculumChunk]:
    from rag.vectorstore_loader import get_vectorstore_components

    _, collection, embedder = get_vectorstore_components()

    prefixed_query = f"Represent this sentence for searching relevant passages: {query}"

    # FIX (issue #160): chroma 1.5.9 query+where raises InternalError
    # "Error finding id" whenever the filter matches; unfiltered query and
    # filtered get both work, so filter candidates in Python. No re-ingest.
    if storage_path:
        try:
            query_embedding = embedder.encode(
                prefixed_query,
                normalize_embeddings=True,
            ).tolist()
            return _retrieve_exact_file_chunks(
                collection,
                embedder,
                query_embedding,
                storage_path,
                subject,
                quarter,
                content_domain,
                chunk_type,
                module_id,
                lesson_id,
                competency_code,
                top_k,
            )
        except Exception:
            pass

    fetch_n = max(int(top_k) * 10, 50)
    _, result, _ = _query_embeddings_with_fallback(collection, embedder, prefixed_query, fetch_n)

    documents = (result.get("documents") or [[]])[0]
    metadatas = (result.get("metadatas") or [[]])[0]
    distances = (result.get("distances") or [[]])[0]

    rows: List[CurriculumChunk] = []
    for idx, content in enumerate(documents):
        md = metadatas[idx] if idx < len(metadatas) and isinstance(metadatas[idx], dict) else {}
        distance = float(distances[idx]) if idx < len(distances) else 1.0
        if _metadata_matches(
            md,
            subject=subject,
            quarter=quarter,
            content_domain=content_domain,
            chunk_type=chunk_type,
            module_id=module_id,
            lesson_id=lesson_id,
            competency_code=competency_code,
            storage_path=storage_path,
        ):
            rows.append(_row_from_chunk(content, md, distance, storage_path=storage_path))
        if len(rows) >= max(1, top_k):
            break
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
) -> Tuple[list[CurriculumChunk], str]:
    """Retrieve chunks by storage_path exact match + semantic ranking; fallback to general query.

    NOTE: Curriculum PDF chunks are often tagged with quarter=1 or 0 even when covering other topics.
    When storage_path is specified, exact-match retrieval searches by exact path/filename with
    hierarchical fallback (exact quarter -> subject only -> file only) before falling back to general queries.
    """
    stripped_topic = (topic or "").strip()
    is_code_like = bool(
        stripped_topic.upper().startswith(("GM11-", "M11GM-", "SP11-", "M11SP-", "FM11-", "GM11", "M11", "SP11"))
        or (" " not in stripped_topic and any(c.isdigit() for c in stripped_topic) and ("-" in stripped_topic or "_" in stripped_topic))
        or re.match(r"^[A-Za-z0-9]+([-_][A-Za-z0-9]+)+$", stripped_topic)
    )

    if is_code_like or (lesson_title and lesson_title.strip()):
        query_parts: List[str] = []
        if lesson_title and lesson_title.strip():
            query_parts.append(lesson_title.strip())
        if competency and competency.strip() and competency.strip() not in query_parts:
            query_parts.append(competency.strip())
        if not query_parts:
            query_parts.append(stripped_topic)
        search_query = " - ".join(query_parts)
    elif competency and competency.strip():
        search_query = f"{stripped_topic} - {competency.strip()}"
    else:
        search_query = stripped_topic

    exact_chunks: list[CurriculumChunk] = []
    if storage_path:
        # Try 1: Exact match with storage_path + quarter
        if quarter and quarter > 0:
            exact_chunks = retrieve_curriculum_context(
                query=search_query,
                subject=subject,
                quarter=quarter,
                storage_path=storage_path,
                top_k=top_k,
            )
            if exact_chunks and any(c.get("score", 0) >= 0.65 for c in exact_chunks):
                return exact_chunks, "exact"

        # Try 1b: Exact match with storage_path + subject (without quarter filter)
        if not exact_chunks or not any(c.get("score", 0) >= 0.65 for c in exact_chunks):
            fallback_chunks = retrieve_curriculum_context(
                query=search_query,
                subject=subject,
                storage_path=storage_path,
                top_k=top_k,
            )
            if fallback_chunks:
                exact_chunks = fallback_chunks
                if any(c.get("score", 0) >= 0.65 for c in exact_chunks):
                    return exact_chunks, "exact"

        # Try 1c: Exact match with storage_path alone (file only)
        if not exact_chunks or not any(c.get("score", 0) >= 0.65 for c in exact_chunks):
            fallback_chunks = retrieve_curriculum_context(
                query=search_query,
                storage_path=storage_path,
                top_k=top_k,
            )
            if fallback_chunks:
                exact_chunks = fallback_chunks
                if any(c.get("score", 0) >= 0.65 for c in exact_chunks):
                    return exact_chunks, "exact"

    # Try 2: General query with exact quarter
    general_chunks = retrieve_curriculum_context(
        query=search_query,
        subject=subject,
        quarter=quarter,
        top_k=top_k,
    )

    # Try 3: Fallback to quarter=1 (most curriculum PDFs are tagged Q1)
    if not general_chunks and quarter != 1:
        general_chunks = retrieve_curriculum_context(
            query=search_query,
            subject=subject,
            quarter=1,
            top_k=top_k,
        )

    # Try 4: Final fallback - no quarter filter at all
    if not general_chunks:
        general_chunks = retrieve_curriculum_context(
            query=search_query,
            subject=subject,
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

    if exact_chunks and not general_chunks:
        return exact_chunks, "exact"

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
        "You are a DepEd-aligned Grade 11 mathematics instructional designer.\n"
        "Generate a lesson in JSON format. Use ONLY the retrieved curriculum evidence below.\n"
        "Do NOT invent content. Do NOT add generic motivational text. All content must be grounded in the retrieved excerpts.\n\n"
        f"Lesson title: {lesson_title}\n"
        f"Competency code: {competency_code or 'n/a'}\n"
        f"Curriculum competency: {competency}\n"
        f"Grade level: {grade_level}\n"
        f"Subject: {subject}\n"
        f"Quarter: Q{quarter}\n"
        f"Learner level: {learner_level or 'Grade 11'}\n"
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


def build_analysis_curriculum_context(
    weak_topics: list[str], subject: str
) -> list[CurriculumChunk]:
    dedup: Dict[str, CurriculumChunk] = {}
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
