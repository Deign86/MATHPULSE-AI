"""
MathPulse AI - Diagnostic Assessment Router
POST /api/diagnostic/generate - Generate 15-item diagnostic test grounded in RAG curriculum
POST /api/diagnostic/submit  - Score responses, run risk analysis, save to Firestore
"""

from __future__ import annotations

import json
import logging
import traceback
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from services.ai_client import CHAT_MODEL, get_deepseek_client
from rag.curriculum_rag import retrieve_curriculum_context

logger = logging.getLogger("mathpulse.diagnostic")

router = APIRouter(prefix="/api/diagnostic", tags=["diagnostic"])


# ─── Pydantic Models ───────────────────────────────────────────────

class DiagnosticGenerateRequest(BaseModel):
    strand: str = Field(..., description="Student strand: ABM, STEM, HUMSS, GAS, TVL")
    grade_level: str = Field(..., description="Grade level: Grade 11 or Grade 12")


class DiagnosticOption(BaseModel):
    A: str
    B: str
    C: str
    D: str


class DiagnosticQuestionStripped(BaseModel):
    question_id: str
    competency_code: str
    domain: str
    topic: str
    difficulty: str
    bloom_level: str
    question_text: str
    options: DiagnosticOption
    curriculum_reference: str


class DiagnosticGenerateResponse(BaseModel):
    test_id: str
    questions: List[DiagnosticQuestionStripped]
    total_items: int
    estimated_minutes: float


class DiagnosticResponseItem(BaseModel):
    question_id: str
    student_answer: str
    time_spent_seconds: int


class DiagnosticSubmitRequest(BaseModel):
    test_id: str
    responses: List[DiagnosticResponseItem]


class MasterySummary(BaseModel):
    mastered: List[str]
    developing: List[str]
    beginning: List[str]


class DiagnosticSubmitResponse(BaseModel):
    success: bool
    overall_risk: str
    overall_score_percent: float
    mastery_summary: MasterySummary
    recommended_intervention: str
    xp_earned: int
    badge_unlocked: str
    redirect_to: str


# ─── Competency Code Registry ───────────────────────────────────────

COMPETENCY_REGISTRY = {
    "NA-WAGE-01": {"subject": "General Mathematics", "title": "Wages, Salaries, Overtime, Commissions, VAT"},
    "NA-SEQ-01": {"subject": "General Mathematics", "title": "Arithmetic Sequences and Series"},
    "NA-SEQ-02": {"subject": "General Mathematics", "title": "Geometric Sequences and Series"},
    "NA-FUNC-01": {"subject": "General Mathematics", "title": "Functions, Relations, Vertical Line Test"},
    "NA-FUNC-02": {"subject": "General Mathematics", "title": "Evaluating Functions, Operations, Composition"},
    "NA-FUNC-03": {"subject": "General Mathematics", "title": "One-to-One Functions, Inverse Functions"},
    "NA-EXP-01": {"subject": "General Mathematics", "title": "Exponential Functions, Equations, Inequalities"},
    "NA-LOG-01": {"subject": "General Mathematics", "title": "Logarithmic Functions"},
    "MG-TRIG-01": {"subject": "General Mathematics", "title": "Trigonometric Ratios, Right Triangles"},
    "NA-FIN-01": {"subject": "General Mathematics", "title": "Compound Interest, Maturity Value"},
    "NA-FIN-02": {"subject": "General Mathematics", "title": "Simple and General Annuities"},
    "NA-FIN-04": {"subject": "General Mathematics", "title": "Business and Consumer Loans, Amortization"},
    "NA-LOGIC-01": {"subject": "General Mathematics", "title": "Logical Propositions, Connectives, Truth Tables"},
    "BM-FDP-01": {"subject": "Business Mathematics", "title": "Fractions, Decimals, Percent Conversions"},
    "BM-FDP-02": {"subject": "Business Mathematics", "title": "Proportion: Direct, Inverse, Partitive"},
    "BM-BUS-01": {"subject": "Business Mathematics", "title": "Markup, Margin, Trade Discounts, VAT"},
    "BM-BUS-02": {"subject": "Business Mathematics", "title": "Profit, Loss, Break-even Point"},
    "BM-COMM-01": {"subject": "Business Mathematics", "title": "Straight Commission, Salary Plus Commission"},
    "BM-COMM-02": {"subject": "Business Mathematics", "title": "Commission on Cash and Installment Basis"},
    "BM-SW-01": {"subject": "Business Mathematics", "title": "Salary vs. Wage, Income"},
    "BM-SW-03": {"subject": "Business Mathematics", "title": "Mandatory Deductions: SSS, PhilHealth, Pag-IBIG"},
    "BM-SW-04": {"subject": "Business Mathematics", "title": "Overtime Pay Computation (Labor Code)"},
    "SP-RV-01": {"subject": "Statistics & Probability", "title": "Random Variables, Discrete vs. Continuous"},
    "SP-RV-02": {"subject": "Statistics & Probability", "title": "Probability Distribution, Mean, Variance, SD"},
    "SP-NORM-01": {"subject": "Statistics & Probability", "title": "Normal Curve Properties"},
    "SP-NORM-02": {"subject": "Statistics & Probability", "title": "Z-Scores, Standard Normal Table"},
    "SP-SAMP-01": {"subject": "Statistics & Probability", "title": "Types of Random Sampling"},
    "SP-SAMP-03": {"subject": "Statistics & Probability", "title": "Central Limit Theorem"},
    "SP-HYP-01": {"subject": "Statistics & Probability", "title": "Hypothesis Testing: H0 and Ha"},
    "FM1-MAT-01": {"subject": "Finite Mathematics", "title": "Matrices and Matrix Operations"},
    "FM2-PROB-01": {"subject": "Finite Mathematics", "title": "Counting Principles and Permutations"},
    "FM2-PROB-02": {"subject": "Finite Mathematics", "title": "Combinations and Probability"},
}

LEARNING_PATH_ORDER: Dict[str, List[str]] = {
    "BM": ["BM-FDP-01", "BM-FDP-02", "BM-BUS-01", "BM-BUS-02", "BM-COMM-01",
           "BM-COMM-02", "BM-SW-01", "BM-SW-03", "BM-SW-04"],
    "NA": ["NA-WAGE-01", "NA-SEQ-01", "NA-SEQ-02", "NA-FUNC-01", "NA-FUNC-02",
           "NA-FUNC-03", "NA-EXP-01", "NA-LOG-01", "NA-FIN-01", "NA-FIN-02",
           "NA-FIN-04", "NA-LOGIC-01"],
    "SP": ["SP-RV-01", "SP-RV-02", "SP-NORM-01", "SP-NORM-02", "SP-SAMP-01",
           "SP-SAMP-03", "SP-HYP-01"],
}


STRAND_SUBJECTS: Dict[str, List[str]] = {
    "ABM": ["General Mathematics", "Business Mathematics"],
    "STEM": ["General Mathematics", "Statistics and Probability"],
    "HUMSS": ["General Mathematics"],
    "GAS": ["General Mathematics"],
    "TVL": ["General Mathematics"],
}


FULL_QUESTION_SCHEMA: Dict[str, List[str]] = {
    "ABM": [
        "General Mathematics: 5 items",
        "Business Mathematics: 5 items",
        "Statistics & Probability: 5 items",
    ],
    "STEM": [
        "General Mathematics: 7 items",
        "Statistics & Probability: 5 items",
        "Finite Mathematics: 3 items",
    ],
    "HUMSS": ["General Mathematics: 15 items"],
    "GAS": ["General Mathematics: 15 items"],
    "TVL": ["General Mathematics: 15 items"],
}

STRAND_COVERAGE_TEXT: Dict[str, str] = {
    "ABM": """FOR ABM STRAND:
  - 5 questions: General Mathematics (NA-WAGE, NA-SEQ, NA-FIN topics -- wages, sequences, interest)
  - 5 questions: Business Mathematics (BM-FDP, BM-BUS, BM-COMM, BM-SW topics -- percent, markup, commission, salaries, deductions using SSS/PhilHealth/Pag-IBIG rates)
  - 5 questions: Statistics & Probability (SP-RV, SP-NORM topics -- random variables, normal distribution, z-scores)""",
    "STEM": """FOR STEM STRAND:
  - 7 questions: General Mathematics (NA-FUNC, NA-EXP, NA-LOG, MG-TRIG, NA-FIN -- functions, exponentials, trigonometry, financial math)
  - 5 questions: Statistics & Probability (SP-RV, SP-NORM, SP-SAMP, SP-HYP -- distributions, sampling, hypothesis)
  - 3 questions: Finite Mathematics (FM1-MAT or FM2-PROB -- matrices or counting/probability)""",
    "HUMSS": """FOR HUMSS STRAND:
  - 15 questions: General Mathematics only (spread across NA-WAGE, NA-SEQ, NA-FUNC, NA-FIN, NA-LOGIC -- wages, sequences, functions, interest, logic)""",
    "GAS": """FOR GAS STRAND:
  - 15 questions: General Mathematics only (spread across NA-WAGE, NA-SEQ, NA-FUNC, NA-FIN, NA-LOGIC -- wages, sequences, functions, interest, logic)""",
    "TVL": """FOR TVL STRAND:
  - 15 questions: General Mathematics only (spread across NA-WAGE, NA-SEQ, NA-FUNC, NA-FIN, NA-LOGIC -- wages, sequences, functions, interest, logic)""",
}


def _get_strand_coverage(strand: str) -> str:
    return STRAND_COVERAGE_TEXT.get(strand.upper(), STRAND_COVERAGE_TEXT["STEM"])


def _build_rag_context(strand: str) -> str:
    subjects = STRAND_SUBJECTS.get(strand.upper(), ["General Mathematics"])
    rag_context_parts: List[str] = []

    rag_query = f"SHS {strand} diagnostic assessment competency questions Grade 11"

    for subject in subjects:
        try:
            chunks = retrieve_curriculum_context(
                query=rag_query,
                subject=subject,
                top_k=3,
            )
        except Exception as e:
            logger.warning(f"[WARN] RAG unavailable for {subject}: {e}")
            continue

        if not chunks:
            continue

        chunk_texts: List[str] = []
        for chunk in chunks:
            source = chunk.get("source_file", "unknown")
            content = str(chunk.get("content", ""))[:600]
            chunk_texts.append(f"[Source: {source}]\n{content}")
        rag_context_parts.append(
            f"\n=== {subject.upper()} CURRICULUM REFERENCE ===\n" + "\n---\n".join(chunk_texts)
        )

    if not rag_context_parts:
        logger.warning("[WARN] RAG unavailable for diagnostic generation -- proceeding without curriculum context")
        return ""

    return "\n".join(rag_context_parts)


def _build_system_prompt(strand: str, grade_level: str, rag_context: str) -> str:
    strand_upper = strand.upper()
    coverage_text = _get_strand_coverage(strand_upper)

    rag_block = ""
    if rag_context:
        rag_block = f"""
OFFICIAL CURRICULUM REFERENCE (from indexed DepEd modules via RAG):
{rag_context}

IMPORTANT: Base ALL questions strictly on the curriculum content above.
Do not invent formulas, definitions, or problem types not found in the
reference material. If the reference material is insufficient for a topic,
use only standard DepEd SHS competencies for that strand.
"""

    return f"""SYSTEM ROLE:
You are MathPulse AI's Diagnostic Test Generator. Your job is to create a
15-item multiple-choice diagnostic assessment for a Filipino SHS student,
strictly grounded in the DepEd Strengthened SHS Curriculum (SDO Navotas
modules and DepEd K-12 Curriculum Guides).

STUDENT CONTEXT:
- Strand: {strand_upper}
- Grade Level: {grade_level}
- Test Purpose: DIAGNOSTIC (pre-learning, not summative -- assess current
  knowledge to build a personalized learning path)
{rag_block}
STRAND-SUBJECT COVERAGE:
Generate 15 questions distributed across these subjects and domains:

{coverage_text}

COMPETENCY CODE FORMAT:
Assign each question exactly one competency_code from this registry:
General Math:    NA-WAGE-01, NA-SEQ-01, NA-SEQ-02, NA-FUNC-01,
                 NA-FUNC-02, NA-FUNC-03, NA-EXP-01, NA-LOG-01,
                 MG-TRIG-01, NA-FIN-01, NA-FIN-02, NA-FIN-04,
                 NA-LOGIC-01
Business Math:   BM-FDP-01, BM-FDP-02, BM-BUS-01, BM-BUS-02,
                 BM-COMM-01, BM-COMM-02, BM-SW-01, BM-SW-03, BM-SW-04
Statistics:      SP-RV-01, SP-RV-02, SP-NORM-01, SP-NORM-02,
                 SP-SAMP-01, SP-SAMP-03, SP-HYP-01
Finite Math:     FM1-MAT-01, FM2-PROB-01, FM2-PROB-02

DIFFICULTY DISTRIBUTION (across all 15 questions):
  - Easy   (Bloom: remembering / understanding): 6 questions (40%)
  - Medium (Bloom: applying / analyzing):         6 questions (40%)
  - Hard   (Bloom: evaluating / creating):        3 questions (20%)

QUESTION RULES:
1. All questions are 4-option multiple choice (A, B, C, D).
2. Use Filipino real-life context: peso amounts, Filipino names
   (Juan, Maria, Jose), Philippine institutions (SSS, PhilHealth,
   Pag-IBIG, BIR, BDO, local schools, SM malls).
3. Never use trick questions. Wrong options must be plausible but clearly
   incorrect to a student who knows the concept.
4. Include a solution_hint (1-2 sentences) -- this is for the backend
   scoring engine ONLY. NEVER include it in the client response.
5. Cover as many different competency codes as possible across 15 items.
   Do not repeat the same competency code more than twice.

OUTPUT FORMAT (strict JSON array, no extra text, no markdown):
[
  {{
    "question_id": "DX-<uuid>",
    "competency_code": "BM-SW-03",
    "domain": "Business Mathematics",
    "topic": "Mandatory Deductions",
    "difficulty": "medium",
    "bloom_level": "applying",
    "question_text": "...",
    "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}},
    "correct_answer": "C",
    "solution_hint": "Compute SSS contribution using the prescribed table...",
    "curriculum_reference": "SDO Navotas Bus. Math SHS 1st Sem - Salaries and Wages"
  }}
]
"""


async def _call_deepseek(system_prompt: str, user_message: str, temperature: float = 0.7) -> str:
    try:
        client = get_deepseek_client()
        response = client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=temperature,
            response_format={"type": "json_object"},
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        logger.error(f"DeepSeek API error: {e}")
        raise HTTPException(status_code=500, detail="AI model unavailable. Please try again later.")


def _parse_questions_response(raw_response: str) -> List[Dict[str, Any]]:
    try:
        data = json.loads(raw_response)
        if isinstance(data, dict):
            for key in ("questions", "items", "data", "results"):
                if key in data and isinstance(data[key], list):
                    return data[key]
            for key, value in data.items():
                if isinstance(value, list) and len(value) > 0 and isinstance(value[0], dict):
                    if "question_text" in value[0]:
                        return value
        if isinstance(data, list):
            return data
    except json.JSONDecodeError:
        pass

    import re
    match = re.search(r'\[.*\]', raw_response, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    raise ValueError("Could not parse questions from AI response")


async def _generate_questions(strand: str, grade_level: str) -> tuple[str, List[Dict[str, Any]]]:
    test_id = f"DX-{uuid.uuid4().hex[:12]}"
    rag_context = _build_rag_context(strand)
    system_prompt = _build_system_prompt(strand, grade_level, rag_context)
    user_message = f"Generate 15 diagnostic questions for a Grade 11 {strand} student."

    for attempt in range(2):
        temperature = 0.7 if attempt == 0 else 0.3
        try:
            raw_response = await _call_deepseek(system_prompt, user_message, temperature)
            questions = _parse_questions_response(raw_response)
            if questions:
                return test_id, questions[:15]
        except ValueError:
            if attempt == 0:
                logger.warning("Malformed JSON from DeepSeek, retrying with temperature=0.3")
                continue
            raise

    raise HTTPException(status_code=500, detail="Assessment generation failed. Please try again.")


async def _store_diagnostic_session(
    firestore_client: Any,
    user_id: str,
    test_id: str,
    strand: str,
    grade_level: str,
    questions: List[Dict[str, Any]],
) -> bool:
    try:
        doc_ref = (
            firestore_client.collection("diagnosticSessions")
            .document(test_id)
        )
        doc_ref.set({
            "testId": test_id,
            "userId": user_id,
            "generatedAt": firestore_client.SERVER_TIMESTAMP,
            "strand": strand,
            "gradeLevel": grade_level,
            "questions": questions,
            "status": "in_progress",
        })
        return True
    except Exception as e:
        logger.error(f"Failed to store diagnostic session: {e}")
        return False


def _strip_answers(questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    stripped = []
    for q in questions:
        stripped.append({
            "question_id": q.get("question_id", ""),
            "competency_code": q.get("competency_code", ""),
            "domain": q.get("domain", ""),
            "topic": q.get("topic", ""),
            "difficulty": q.get("difficulty", ""),
            "bloom_level": q.get("bloom_level", ""),
            "question_text": q.get("question_text", ""),
            "options": q.get("options", {}),
            "curriculum_reference": q.get("curriculum_reference", ""),
        })
    return stripped


# ─── ENDPOINT 1: Generate Diagnostic ────────────────────────────────

@router.post("/generate", response_model=DiagnosticGenerateResponse)
async def generate_diagnostic(request: DiagnosticGenerateRequest, req: Request):
    user = getattr(req.state, "user", None)
    if not user or not getattr(user, "uid", None):
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        test_id, questions = await _generate_questions(
            request.strand,
            request.grade_level,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Generation error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Assessment generation failed. Please try again.")

    try:
        import firebase_admin
        from firebase_admin import firestore as fs
        firestore_client = fs.client()
        await _store_diagnostic_session(
            firestore_client,
            user.uid,
            test_id,
            request.strand,
            request.grade_level,
            questions,
        )
    except Exception as e:
        logger.warning(f"Could not store diagnostic session: {e}")

    client_questions = _strip_answers(questions)

    return DiagnosticGenerateResponse(
        test_id=test_id,
        questions=client_questions,
        total_items=len(client_questions),
        estimated_minutes=11.6,
    )


# ─── ENDPOINT 2: Submit and Evaluate ─────────────────────────────────

def _score_responses(stored_questions: List[Dict[str, Any]], responses: List[DiagnosticResponseItem]) -> tuple:
    question_map: Dict[str, Dict[str, Any]] = {}
    for q in stored_questions:
        question_map[q.get("question_id", "")] = q

    scored = []
    total_correct = 0
    domain_correct: Dict[str, int] = {}
    domain_total: Dict[str, int] = {}
    comp_attempts: Dict[str, List[bool]] = {}

    for resp in responses:
        question = question_map.get(resp.question_id, {})
        correct_answer = question.get("correct_answer", "")
        is_correct = (resp.student_answer.strip().upper() == correct_answer.strip().upper())

        domain = question.get("domain", "Unknown")
        competency_code = question.get("competency_code", "")

        if domain not in domain_correct:
            domain_correct[domain] = 0
            domain_total[domain] = 0
        domain_total[domain] += 1
        if is_correct:
            domain_correct[domain] += 1
            total_correct += 1

        if competency_code not in comp_attempts:
            comp_attempts[competency_code] = []
        comp_attempts[competency_code].append(is_correct)

        scored.append({
            "question_id": resp.question_id,
            "competency_code": competency_code,
            "domain": domain,
            "topic": question.get("topic", ""),
            "difficulty": question.get("difficulty", ""),
            "bloom_level": question.get("bloom_level", ""),
            "student_answer": resp.student_answer,
            "correct_answer": correct_answer,
            "is_correct": is_correct,
            "time_spent_seconds": resp.time_spent_seconds,
        })

    return scored, total_correct, domain_correct, domain_total, comp_attempts


def _compute_domain_scores(domain_correct: Dict[str, int], domain_total: Dict[str, int]) -> Dict[str, Dict[str, Any]]:
    domain_scores = {}
    for domain in domain_total:
        correct = domain_correct.get(domain, 0)
        total = domain_total[domain]
        pct = (correct / total * 100) if total > 0 else 0
        mastery = "mastered" if pct >= 80 else "developing" if pct >= 60 else "beginning"
        domain_scores[domain] = {
            "correct": correct,
            "total": total,
            "percentage": round(pct, 1),
            "mastery_level": mastery,
        }
    return domain_scores


def _compute_risk_profile(
    total_correct: int,
    total_items: int,
    scored_responses: List[Dict[str, Any]],
    domain_scores: Dict[str, Dict[str, Any]],
) -> Dict[str, Any]:
    overall_pct = (total_correct / total_items * 100) if total_items > 0 else 0

    mastered = [d for d, s in domain_scores.items() if s["mastery_level"] == "mastered"]
    developing = [d for d, s in domain_scores.items() if s["mastery_level"] == "developing"]
    beginning = [d for d, s in domain_scores.items() if s["mastery_level"] == "beginning"]

    critical_gaps = []
    for resp in scored_responses:
        code = resp.get("competency_code", "")
        if not code:
            continue
        attempts = [r for r in scored_responses if r.get("competency_code") == code]
        if len(attempts) >= 2 and not any(r.get("is_correct") for r in attempts):
            if code not in critical_gaps:
                critical_gaps.append(code)

    if overall_pct >= 75 and len(beginning) == 0:
        overall_risk = "low"
    elif overall_pct >= 55 or len(beginning) <= 2:
        overall_risk = "moderate"
    elif overall_pct >= 40 or len(beginning) <= 4:
        overall_risk = "high"
    else:
        overall_risk = "critical"

    suggested_path = []
    for code in critical_gaps:
        if code not in suggested_path:
            suggested_path.append(code)
    for domain in beginning:
        for prefix in ["NA", "BM", "SP", "FM"]:
            if domain.upper().startswith(prefix) or any(
                s.upper().startswith(prefix) for s in [domain]
            ):
                for comp_code in LEARNING_PATH_ORDER.get(prefix, []):
                    if comp_code not in suggested_path:
                        suggested_path.append(comp_code)
                break
    for domain in developing:
        for prefix in ["NA", "BM", "SP", "FM"]:
            if any(c.startswith(prefix) for c in COMPETENCY_REGISTRY):
                for comp_code in LEARNING_PATH_ORDER.get(prefix, []):
                    if comp_code not in suggested_path:
                        suggested_path.append(comp_code)

    interventions = {
        "low": "Great job! You have a solid foundation. Keep practicing to maintain your skills!",
        "moderate": "You're making good progress. Focus on the topics where you need more practice. Kaya mo yan!",
        "high": "Don't worry! With focused practice on your weak areas, you'll improve quickly.",
        "critical": "Let's work on this together. Start with the basics and build up your confidence step by step.",
    }

    return {
        "overall_risk": overall_risk,
        "overall_score_percent": round(overall_pct, 1),
        "mastery_summary": {
            "mastered": mastered,
            "developing": developing,
            "beginning": beginning,
        },
        "weak_domains": beginning,
        "critical_gaps": critical_gaps,
        "recommended_intervention": interventions.get(overall_risk, interventions["moderate"]),
        "suggested_learning_path": suggested_path[:20],
    }


async def _save_results(
    firestore_client: Any,
    user_id: str,
    test_id: str,
    strand: str,
    grade_level: str,
    scored_responses: List[Dict[str, Any]],
    domain_scores: Dict[str, Dict[str, Any]],
    risk_profile: Dict[str, Any],
    total_correct: int,
    total_items: int,
) -> None:
    try:
        overall_pct = round(total_correct / total_items * 100, 1) if total_items > 0 else 0

        firestore_client.collection("diagnosticResults").document(user_id).set({
            "userId": user_id,
            "testId": test_id,
            "takenAt": firestore_client.SERVER_TIMESTAMP,
            "strand": strand,
            "gradeLevel": grade_level,
            "status": "completed",
            "totalItems": total_items,
            "totalScore": total_correct,
            "percentageScore": overall_pct,
            "responses": scored_responses,
            "domainScores": domain_scores,
            "riskProfile": risk_profile,
        })

        mastered_count = len(risk_profile.get("mastery_summary", {}).get("mastered", []))

        firestore_client.collection("studentProgress").document(user_id).collection("stats").document("main").set({
            "learning_path": risk_profile.get("suggested_learning_path", []),
            "current_topic_index": 0,
            "total_xp": firestore_client.Increment(50 + mastered_count * 10),
            "current_streak_days": 1,
            "badges": firestore_client.ArrayUnion(["first_assessment"]),
            "topics_mastered": mastered_count,
            "diagnostic_completed": True,
            "overall_risk": risk_profile.get("overall_risk", "moderate"),
        }, merge=True)

        firestore_client.collection("diagnosticSessions").document(test_id).update({
            "status": "completed",
            "completedAt": firestore_client.SERVER_TIMESTAMP,
        })

    except Exception as e:
        logger.error(f"Firestore save error: {e}")
        raise


@router.post("/submit", response_model=DiagnosticSubmitResponse)
async def submit_diagnostic(request: DiagnosticSubmitRequest, req: Request):
    user = getattr(req.state, "user", None)
    if not user or not getattr(user, "uid", None):
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        import firebase_admin
        from firebase_admin import firestore as fs
        firestore_client = fs.client()
    except Exception as e:
        raise HTTPException(status_code=503, detail="Database unavailable")

    try:
        session_doc = firestore_client.collection("diagnosticSessions").document(request.test_id).get()
        if not session_doc.exists:
            raise HTTPException(status_code=404, detail="Diagnostic session not found")

        session_data = session_doc.to_dict() or {}
        stored_questions = session_data.get("questions", [])
        strand = session_data.get("strand", "STEM")
        grade_level = session_data.get("gradeLevel", "Grade 11")

        if not stored_questions:
            raise HTTPException(status_code=400, detail="No questions found for this session")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Session retrieval error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve diagnostic session")

    scored_responses, total_correct, domain_correct, domain_total, _ = _score_responses(
        stored_questions, request.responses
    )

    total_items = len(stored_questions)
    domain_scores = _compute_domain_scores(domain_correct, domain_total)
    risk_profile = _compute_risk_profile(total_correct, total_items, scored_responses, domain_scores)

    await _save_results(
        firestore_client,
        user.uid,
        request.test_id,
        strand,
        grade_level,
        scored_responses,
        domain_scores,
        risk_profile,
        total_correct,
        total_items,
    )

    mastered_count = len(risk_profile.get("mastery_summary", {}).get("mastered", []))

    return DiagnosticSubmitResponse(
        success=True,
        overall_risk=risk_profile["overall_risk"],
        overall_score_percent=risk_profile["overall_score_percent"],
        mastery_summary=MasterySummary(**risk_profile["mastery_summary"]),
        recommended_intervention=risk_profile["recommended_intervention"],
        xp_earned=50 + mastered_count * 10,
        badge_unlocked="first_assessment",
        redirect_to="/dashboard",
    )
