"""
MathPulse AI - FastAPI Backend
AI-powered math tutoring backend using Hugging Face models.
- Qwen/Qwen2.5-Math-7B-Instruct for chat, learning paths, and insights
- facebook/bart-large-mnli for student risk classification
- Multi-method verification system for math accuracy

Auto-deployed to HuggingFace Spaces via GitHub Actions.
"""

import os
import io
import re
import json
import logging
import traceback
from typing import List, Optional, Dict, Any
from collections import Counter

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

# ─── Configuration ─────────────────────────────────────────────

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mathpulse")

HF_TOKEN = os.environ.get("HUGGING_FACE_API_TOKEN", os.environ.get("HF_TOKEN", ""))
CHAT_MODEL = "Qwen/Qwen2.5-Math-7B-Instruct"
RISK_MODEL = "facebook/bart-large-mnli"
VERIFICATION_SAMPLES = 3  # Number of samples for self-consistency checking

# ─── FastAPI App ───────────────────────────────────────────────

app = FastAPI(
    title="MathPulse AI API",
    description="AI-powered math tutoring and student analytics backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Hugging Face Client ──────────────────────────────────────

from huggingface_hub import InferenceClient

client: Optional[InferenceClient] = None


def get_client() -> InferenceClient:
    global client
    if client is None:
        if not HF_TOKEN:
            raise HTTPException(
                status_code=500,
                detail="HUGGING_FACE_API_TOKEN not configured. Set the HF_TOKEN environment variable.",
            )
        client = InferenceClient(token=HF_TOKEN)
        logger.info("Hugging Face InferenceClient initialized")
    return client


# ─── Request/Response Models ──────────────────────────────────


class ChatMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = Field(default_factory=list)
    userId: Optional[str] = None
    verify: bool = Field(default=False, description="Enable self-consistency verification for math answers")


class ChatResponse(BaseModel):
    response: str
    verified: Optional[bool] = None
    confidence: Optional[str] = None
    warning: Optional[str] = None


class StudentRiskData(BaseModel):
    engagementScore: float = Field(..., ge=0, le=100)
    avgQuizScore: float = Field(..., ge=0, le=100)
    attendance: float = Field(..., ge=0, le=100)
    assignmentCompletion: float = Field(..., ge=0, le=100)


class RiskPrediction(BaseModel):
    riskLevel: str
    confidence: float
    analysis: dict


class BatchRiskRequest(BaseModel):
    students: List[StudentRiskData]


class LearningPathRequest(BaseModel):
    weaknesses: List[str]
    gradeLevel: str
    learningStyle: Optional[str] = "visual"


class LearningPathResponse(BaseModel):
    learningPath: str


class StudentInsightData(BaseModel):
    name: str
    engagementScore: float
    avgQuizScore: float
    attendance: float
    riskLevel: str


class DailyInsightRequest(BaseModel):
    students: List[StudentInsightData]


class DailyInsightResponse(BaseModel):
    insight: str


class VerificationResult(BaseModel):
    verified: bool
    confidence: str
    response: str
    warning: Optional[str] = None


class CodeVerificationResult(BaseModel):
    verified: bool
    code: str
    output: str
    error: Optional[str] = None


class LLMJudgeResult(BaseModel):
    correct: bool
    issues: List[str]
    confidence: float


class VerifySolutionRequest(BaseModel):
    problem: str
    solution: str


class VerifySolutionResponse(BaseModel):
    overall_verified: bool
    aggregated_confidence: float
    self_consistency: Optional[VerificationResult] = None
    code_verification: Optional[CodeVerificationResult] = None
    llm_judge: Optional[LLMJudgeResult] = None
    warnings: List[str] = Field(default_factory=list)


# ─── Routes ────────────────────────────────────────────────────


@app.get("/health")
async def health_check():
    return {"status": "healthy", "models": {"chat": CHAT_MODEL, "risk": RISK_MODEL}}


@app.get("/")
async def root():
    return {
        "name": "MathPulse AI API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }


# ─── AI Chat Tutor (Qwen/Qwen2.5-3B-Instruct) ───────────────


MATH_TUTOR_SYSTEM_PROMPT = """You are MathPulse AI, a rigorous and friendly expert math tutor for students. You help with:
- Algebra, Geometry, Calculus, Trigonometry, Statistics, and all math topics
- Step-by-step problem solving with clear, verifiable explanations
- Practice problems and concept reinforcement
- Building confidence in mathematics

Strict Problem-Solving Protocol:
1. **Restate the Problem**: Begin every solution by clearly restating what is being asked in your own words.
2. **Show ALL Calculation Steps**: Write out every intermediate step with full equations. Never skip arithmetic.
3. **Verify Arithmetic at Each Step**: After each calculation, briefly confirm the result (e.g., "Check: 7 × 8 = 56 ✓").
4. **State the Final Answer Clearly**: End with a clearly labeled final answer including appropriate units (e.g., "**Final Answer: 42 cm²**").
5. **Admit Uncertainty**: If you are unsure about any step or the problem is ambiguous, explicitly say so. Never guess.
6. **Cross-Verify**: For computational problems, verify your answer with a different method when possible (e.g., substitute back, use estimation, or solve via an alternate approach).

Additional Guidelines:
- Use mathematical notation where helpful (e.g., x², √, π)
- Encourage students and celebrate their progress
- If a student is struggling, try explaining from a different angle
- Ask follow-up questions to check understanding
- Keep responses focused and concise (under 300 words unless a detailed derivation is needed)
- Use examples relatable to students' daily life when possible
- If a problem has multiple valid interpretations, address the most likely one and note alternatives"""


@app.post("/api/chat", response_model=ChatResponse)
async def chat_tutor(request: ChatRequest):
    """AI Math Tutor powered by Qwen/Qwen2.5-Math-7B-Instruct"""
    try:
        hf = get_client()

        messages = [{"role": "system", "content": MATH_TUTOR_SYSTEM_PROMPT}]

        # Add conversation history
        for msg in request.history[-10:]:  # Keep last 10 messages for context window
            messages.append({"role": msg.role, "content": msg.content})

        # Add current message
        messages.append({"role": "user", "content": request.message})

        response = hf.chat_completion(
            model=CHAT_MODEL,
            messages=messages,
            max_tokens=2048,
            temperature=0.2,
            top_p=0.9,
        )

        answer = response.choices[0].message.content or ""

        # Optional self-consistency verification
        if request.verify:
            logger.info("Running self-consistency verification for chat response")
            verification = await verify_math_response(request.message, messages)
            return ChatResponse(
                response=verification["response"],
                verified=verification["verified"],
                confidence=verification["confidence"],
                warning=verification.get("warning"),
            )

        return ChatResponse(response=answer)

    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Chat service error: {str(e)}")


# ─── Verification System ──────────────────────────────────────


def _extract_final_answer(text: str) -> Optional[str]:
    """Extract the final numeric/symbolic answer from a math response."""
    # Try to find explicitly labeled final answers
    patterns = [
        r"\*\*Final Answer[:\s]*(.+?)\*\*",
        r"Final Answer[:\s]*(.+?)[\n\.]",
        r"(?:the answer is|= )\s*(.+?)[\n\.\s]",
        r"\\boxed\{(.+?)\}",
    ]
    for pat in patterns:
        match = re.search(pat, text, re.IGNORECASE)
        if match:
            return match.group(1).strip().rstrip(".")
    # Fallback: last line with an equals sign
    for line in reversed(text.strip().splitlines()):
        if "=" in line:
            parts = line.split("=")
            return parts[-1].strip().rstrip(".")
    return None


async def verify_math_response(
    problem: str, base_messages: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Self-consistency verification: generate multiple responses to the same
    math problem and check if the final answers agree.
    Returns dict with 'verified' (bool), 'confidence' (str), and 'response'.
    """
    hf = get_client()
    responses: List[str] = []
    answers: List[Optional[str]] = []

    logger.info(f"Generating {VERIFICATION_SAMPLES} responses for self-consistency check")

    for i in range(VERIFICATION_SAMPLES):
        try:
            result = hf.chat_completion(
                model=CHAT_MODEL,
                messages=base_messages,
                max_tokens=2048,
                temperature=0.7,
                top_p=0.9,
            )
            text = result.choices[0].message.content or ""
            responses.append(text)
            answers.append(_extract_final_answer(text))
            logger.info(f"  Sample {i+1} answer: {answers[-1]}")
        except Exception as e:
            logger.warning(f"  Sample {i+1} failed: {e}")
            responses.append("")
            answers.append(None)

    # Check agreement among non-None answers
    valid_answers = [a for a in answers if a is not None]

    if not valid_answers:
        return {
            "verified": False,
            "confidence": "low",
            "response": responses[0] if responses else "",
            "warning": "Could not extract answers for verification.",
        }

    counter = Counter(valid_answers)
    most_common_answer, most_common_count = counter.most_common(1)[0]
    agreement_ratio = most_common_count / len(valid_answers)

    if agreement_ratio >= 1.0:
        confidence = "high"
        verified = True
    elif agreement_ratio >= 0.6:
        confidence = "medium"
        verified = True
    else:
        confidence = "low"
        verified = False

    # Pick the response whose answer matches the majority
    best_response = responses[0]
    for resp, ans in zip(responses, answers):
        if ans == most_common_answer and resp:
            best_response = resp
            break

    result: Dict[str, Any] = {
        "verified": verified,
        "confidence": confidence,
        "response": best_response,
    }

    if not verified:
        result["warning"] = (
            f"Self-consistency check failed: answers did not converge "
            f"({len(set(valid_answers))} distinct answers from {len(valid_answers)} samples). "
            f"This answer may be unreliable."
        )

    logger.info(f"Self-consistency result: verified={verified}, confidence={confidence}")
    return result


async def verify_with_code(problem: str, solution: str) -> Dict[str, Any]:
    """
    Ask the model to generate Python verification code for a math solution,
    execute it safely, and return the verification result.
    """
    hf = get_client()

    prompt = f"""Given this math problem and its proposed solution, write a short Python script that numerically verifies the answer.

**Problem:** {problem}

**Proposed Solution:** {solution}

Rules:
- Use only the Python standard library and the `math` module.
- The script must print EXACTLY one line: either "VERIFIED" if the solution is correct, or "FAILED: <reason>" if it is wrong.
- Do NOT use input(), networking, file I/O, or any system calls.
- Keep the script under 30 lines.

Respond with ONLY the Python code, no markdown fences, no explanation."""

    try:
        result = hf.chat_completion(
            model=CHAT_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a Python code generator. Output only valid Python code, nothing else.",
                },
                {"role": "user", "content": prompt},
            ],
            max_tokens=800,
            temperature=0.1,
        )

        raw_code = result.choices[0].message.content or ""
        # Strip markdown code fences if present
        code = re.sub(r"^```(?:python)?\s*\n?", "", raw_code.strip())
        code = re.sub(r"\n?```\s*$", "", code)
        code = code.strip()

        if not code:
            return {"verified": False, "code": "", "output": "", "error": "No code generated"}

        logger.info(f"Executing verification code:\n{code}")

        # Execute safely with restricted builtins
        import math as _math

        safe_globals: Dict[str, Any] = {
            "__builtins__": {
                "print": print,
                "range": range,
                "len": len,
                "abs": abs,
                "round": round,
                "int": int,
                "float": float,
                "str": str,
                "sum": sum,
                "min": min,
                "max": max,
                "enumerate": enumerate,
                "zip": zip,
                "map": map,
                "list": list,
                "tuple": tuple,
                "dict": dict,
                "set": set,
                "sorted": sorted,
                "pow": pow,
                "isinstance": isinstance,
                "True": True,
                "False": False,
                "None": None,
            },
            "math": _math,
        }

        # Capture stdout
        import contextlib

        stdout_capture = io.StringIO()
        try:
            with contextlib.redirect_stdout(stdout_capture):
                exec(code, safe_globals)  # noqa: S102
            output = stdout_capture.getvalue().strip()
        except Exception as exec_err:
            output = ""
            return {
                "verified": False,
                "code": code,
                "output": "",
                "error": f"Code execution error: {str(exec_err)}",
            }

        verified = output.upper().startswith("VERIFIED")
        logger.info(f"Code verification output: {output}")

        return {
            "verified": verified,
            "code": code,
            "output": output,
            "error": None,
        }

    except Exception as e:
        logger.error(f"Code verification error: {e}")
        return {"verified": False, "code": "", "output": "", "error": str(e)}


async def llm_judge_verification(problem: str, solution: str) -> Dict[str, Any]:
    """
    Use a second LLM call with low temperature to judge whether a math
    solution is correct. Checks formula usage, calculations, and logic.
    Returns dict with 'correct' (bool), 'issues' (list), 'confidence' (float).
    """
    hf = get_client()

    prompt = f"""You are a meticulous math verification expert. Your job is to verify whether the following solution to a math problem is mathematically correct.

**Problem:** {problem}

**Solution to verify:**
{solution}

Carefully check:
1. Are the correct formulas and theorems applied?
2. Is every arithmetic calculation accurate?
3. Is the logical reasoning valid at each step?
4. Is the final answer correct and in the right units?

Respond with ONLY a JSON object (no markdown, no explanation outside the JSON):
{{
  "correct": true or false,
  "issues": ["list of specific errors or concerns, empty if correct"],
  "confidence": 0.0 to 1.0
}}"""

    try:
        result = hf.chat_completion(
            model=CHAT_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a mathematical verification judge. Respond ONLY with valid JSON.",
                },
                {"role": "user", "content": prompt},
            ],
            max_tokens=500,
            temperature=0.1,
        )

        raw = result.choices[0].message.content or ""
        # Extract JSON from response
        json_start = raw.find("{")
        json_end = raw.rfind("}") + 1
        if json_start >= 0 and json_end > json_start:
            parsed = json.loads(raw[json_start:json_end])
        else:
            logger.warning(f"LLM judge returned non-JSON: {raw[:200]}")
            return {"correct": False, "issues": ["Could not parse judge response"], "confidence": 0.0}

        judge_result = {
            "correct": bool(parsed.get("correct", False)),
            "issues": list(parsed.get("issues", [])),
            "confidence": float(parsed.get("confidence", 0.0)),
        }

        logger.info(f"LLM judge result: correct={judge_result['correct']}, confidence={judge_result['confidence']}")
        return judge_result

    except Exception as e:
        logger.error(f"LLM judge error: {e}\n{traceback.format_exc()}")
        return {"correct": False, "issues": [f"Judge error: {str(e)}"], "confidence": 0.0}


# ─── Verification Endpoint ────────────────────────────────────


@app.post("/api/verify-solution", response_model=VerifySolutionResponse)
async def verify_solution(request: VerifySolutionRequest):
    """
    Run all 3 verification methods on a problem+solution pair:
    1. Self-consistency (multiple samples)
    2. Code-based verification
    3. LLM judge review
    Returns aggregated confidence and per-method results.
    """
    try:
        logger.info(f"Running full verification for problem: {request.problem[:80]}...")
        warnings: List[str] = []

        # Build messages for self-consistency check
        messages = [
            {"role": "system", "content": MATH_TUTOR_SYSTEM_PROMPT},
            {"role": "user", "content": request.problem},
        ]

        # 1. Self-consistency check
        try:
            sc_result = await verify_math_response(request.problem, messages)
            sc_model = VerificationResult(
                verified=sc_result["verified"],
                confidence=sc_result["confidence"],
                response=sc_result["response"],
                warning=sc_result.get("warning"),
            )
            if sc_result.get("warning"):
                warnings.append(f"Self-consistency: {sc_result['warning']}")
        except Exception as e:
            logger.error(f"Self-consistency verification failed: {e}")
            sc_model = VerificationResult(
                verified=False, confidence="low", response="", warning=str(e)
            )
            warnings.append(f"Self-consistency check failed: {str(e)}")

        # 2. Code verification
        try:
            cv_result = await verify_with_code(request.problem, request.solution)
            cv_model = CodeVerificationResult(
                verified=cv_result["verified"],
                code=cv_result.get("code", ""),
                output=cv_result.get("output", ""),
                error=cv_result.get("error"),
            )
            if cv_result.get("error"):
                warnings.append(f"Code verification: {cv_result['error']}")
        except Exception as e:
            logger.error(f"Code verification failed: {e}")
            cv_model = CodeVerificationResult(
                verified=False, code="", output="", error=str(e)
            )
            warnings.append(f"Code verification failed: {str(e)}")

        # 3. LLM judge
        try:
            lj_result = await llm_judge_verification(request.problem, request.solution)
            lj_model = LLMJudgeResult(
                correct=lj_result["correct"],
                issues=lj_result["issues"],
                confidence=lj_result["confidence"],
            )
            if lj_result["issues"]:
                warnings.append(f"LLM judge issues: {'; '.join(lj_result['issues'])}")
        except Exception as e:
            logger.error(f"LLM judge verification failed: {e}")
            lj_model = LLMJudgeResult(correct=False, issues=[str(e)], confidence=0.0)
            warnings.append(f"LLM judge failed: {str(e)}")

        # Aggregate confidence score (0.0 - 1.0)
        scores: List[float] = []

        # Self-consistency score
        sc_score_map = {"high": 1.0, "medium": 0.6, "low": 0.2}
        scores.append(sc_score_map.get(sc_model.confidence, 0.2))

        # Code verification score
        scores.append(1.0 if cv_model.verified else 0.0)

        # LLM judge score
        scores.append(lj_model.confidence if lj_model.correct else (1.0 - lj_model.confidence) * 0.3)

        aggregated = round(sum(scores) / len(scores), 3) if scores else 0.0
        overall_verified = aggregated >= 0.6

        logger.info(
            f"Verification complete: overall_verified={overall_verified}, "
            f"aggregated_confidence={aggregated}"
        )

        return VerifySolutionResponse(
            overall_verified=overall_verified,
            aggregated_confidence=aggregated,
            self_consistency=sc_model,
            code_verification=cv_model,
            llm_judge=lj_model,
            warnings=warnings,
        )

    except Exception as e:
        logger.error(f"Verify solution error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Verification error: {str(e)}")


# ─── Student Risk Classification (facebook/bart-large-mnli) ───


RISK_LABELS = [
    "high risk of failing",
    "medium academic risk",
    "low risk academically stable",
]

RISK_MAPPING = {
    "high risk of failing": "High",
    "medium academic risk": "Medium",
    "low risk academically stable": "Low",
}


@app.post("/api/predict-risk", response_model=RiskPrediction)
async def predict_risk(student_data: StudentRiskData):
    """Student risk prediction using facebook/bart-large-mnli zero-shot classification"""
    try:
        hf = get_client()

        text = (
            f"Student academic performance summary: "
            f"Engagement score is {student_data.engagementScore:.0f}%. "
            f"Average quiz score is {student_data.avgQuizScore:.0f}%. "
            f"Attendance rate is {student_data.attendance:.0f}%. "
            f"Assignment completion rate is {student_data.assignmentCompletion:.0f}%."
        )

        result = hf.zero_shot_classification(
            text=text,
            candidate_labels=RISK_LABELS,
            model=RISK_MODEL,
            multi_label=False,
        )

        # result is list[ZeroShotClassificationOutputElement] sorted by score desc
        # Each element has .label (str) and .score (float)
        top = result[0]
        top_label = top.label
        top_score = top.score

        risk_level = RISK_MAPPING.get(top_label, "Medium")

        return RiskPrediction(
            riskLevel=risk_level,
            confidence=round(float(top_score), 4),
            analysis={
                "labels": [el.label for el in result],
                "scores": [round(el.score, 4) for el in result],
            },
        )

    except Exception as e:
        logger.error(f"Risk prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Risk prediction error: {str(e)}")


@app.post("/api/predict-risk/batch")
async def predict_risk_batch(request: BatchRiskRequest):
    """Batch risk prediction for multiple students"""
    results = []
    for student in request.students:
        try:
            result = await predict_risk(student)
            results.append(result)
        except Exception:
            results.append(
                RiskPrediction(riskLevel="Medium", confidence=0.0, analysis={"labels": [], "scores": []})
            )
    return results


# ─── Learning Path Generation (Qwen model) ────────────────────


@app.post("/api/learning-path", response_model=LearningPathResponse)
async def generate_learning_path(request: LearningPathRequest):
    """Generate AI-powered personalized learning path"""
    try:
        hf = get_client()

        prompt = f"""Generate a personalized math learning path for a student with these details:
- Weak Topics: {', '.join(request.weaknesses)}
- Grade Level: {request.gradeLevel}
- Learning Style: {request.learningStyle or 'visual'}

Create a structured learning path with 5-7 specific activities. For each activity provide:
1. Activity title
2. Brief description (1-2 sentences)
3. Estimated duration
4. Type (video, practice, quiz, reading, interactive)

Format as a numbered list. Be specific to the math topics mentioned."""

        messages = [
            {
                "role": "system",
                "content": "You are an educational curriculum expert specializing in mathematics. Create clear, actionable learning paths.",
            },
            {"role": "user", "content": prompt},
        ]

        response = hf.chat_completion(
            model=CHAT_MODEL,
            messages=messages,
            max_tokens=1500,
            temperature=0.7,
        )

        return LearningPathResponse(learningPath=response.choices[0].message.content or "")

    except Exception as e:
        logger.error(f"Learning path error: {e}")
        raise HTTPException(status_code=500, detail=f"Learning path error: {str(e)}")


# ─── Daily AI Insights (Qwen model) ───────────────────────────


@app.post("/api/analytics/daily-insight", response_model=DailyInsightResponse)
async def daily_insight(request: DailyInsightRequest):
    """Generate daily AI insights for teacher dashboard"""
    try:
        hf = get_client()

        students = request.students
        total = len(students)
        if total == 0:
            return DailyInsightResponse(insight="No student data available for analysis.")

        avg_engagement = sum(s.engagementScore for s in students) / total
        avg_quiz = sum(s.avgQuizScore for s in students) / total
        avg_attendance = sum(s.attendance for s in students) / total
        high_risk = sum(1 for s in students if s.riskLevel == "High")
        medium_risk = sum(1 for s in students if s.riskLevel == "Medium")

        prompt = f"""Analyze this classroom data and provide actionable insights for a math teacher:

Classroom Summary:
- Total Students: {total}
- Average Engagement: {avg_engagement:.1f}%
- Average Quiz Score: {avg_quiz:.1f}%
- Average Attendance: {avg_attendance:.1f}%
- High-Risk Students: {high_risk}
- Medium-Risk Students: {medium_risk}
- Low-Risk Students: {total - high_risk - medium_risk}

Provide:
1. A brief overall assessment (2-3 sentences)
2. 3-4 specific, actionable recommendations for the teacher
3. One positive observation to highlight

Keep the response under 200 words. Be specific and practical."""

        messages = [
            {
                "role": "system",
                "content": "You are an educational data analyst providing insights to math teachers. Be specific, actionable, and encouraging.",
            },
            {"role": "user", "content": prompt},
        ]

        response = hf.chat_completion(
            model=CHAT_MODEL,
            messages=messages,
            max_tokens=800,
            temperature=0.7,
        )

        return DailyInsightResponse(insight=response.choices[0].message.content or "")

    except Exception as e:
        logger.error(f"Daily insight error: {e}")
        raise HTTPException(status_code=500, detail=f"Daily insight error: {str(e)}")


# ─── Smart Document Upload ────────────────────────────────────


@app.post("/api/upload/class-records")
async def upload_class_records(file: UploadFile = File(...)):
    """Upload and parse class records (CSV, Excel, PDF) with AI column detection"""
    try:
        import pandas as pd  # type: ignore[import-not-found]

        filename = file.filename or ""
        contents = await file.read()

        df = None

        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        elif filename.endswith((".xlsx", ".xls")):
            import openpyxl
            df = pd.read_excel(io.BytesIO(contents))
        elif filename.endswith(".pdf"):
            import pdfplumber
            with pdfplumber.open(io.BytesIO(contents)) as pdf:
                tables = []
                for page in pdf.pages:
                    page_tables = page.extract_tables()
                    if page_tables:
                        tables.extend(page_tables)
                if tables and len(tables[0]) > 1:
                    df = pd.DataFrame(tables[0][1:], columns=tables[0][0])
                else:
                    raise HTTPException(status_code=400, detail="No tables found in PDF")
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format: {filename}. Use .csv, .xlsx, or .pdf",
            )

        if df is None or df.empty:
            raise HTTPException(status_code=400, detail="No data found in uploaded file")

        # AI-powered column mapping
        hf = get_client()
        columns_text = ", ".join(df.columns.tolist())

        prompt = f"""I have a spreadsheet with these columns: {columns_text}

Map each column to one of these standard fields (respond as JSON only):
- name (student full name)
- studentId (student ID number)
- email (email address)
- engagementScore (engagement percentage)
- avgQuizScore (average quiz/test score)
- attendance (attendance percentage)

If a column doesn't match any field, skip it. Respond ONLY with a JSON object mapping original column names to field names. Example: {{"Student Name": "name", "ID": "studentId"}}"""

        mapping_response = hf.chat_completion(
            model=CHAT_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0.1,
        )

        # Parse AI column mapping
        raw_content = mapping_response.choices[0].message.content
        mapping_text = (raw_content or "").strip()
        # Extract JSON from response
        try:
            # Try to find JSON in the response
            json_start = mapping_text.find("{")
            json_end = mapping_text.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                column_mapping = json.loads(mapping_text[json_start:json_end])
            else:
                column_mapping = {}
        except json.JSONDecodeError:
            column_mapping = {}

        # Apply mapping and extract student data
        students = []
        for _, row in df.iterrows():
            student = {}
            for orig_col, field in column_mapping.items():
                if orig_col in df.columns:
                    val = row[orig_col]
                    student[field] = str(val) if pd.notna(val) else ""

            # Ensure numeric fields
            for numeric_field in ["engagementScore", "avgQuizScore", "attendance"]:
                if numeric_field in student:
                    try:
                        student[numeric_field] = float(student[numeric_field].replace("%", ""))
                    except (ValueError, AttributeError):
                        student[numeric_field] = 0.0

            if student.get("name"):
                students.append(student)

        return {
            "success": True,
            "students": students,
            "columnMapping": column_mapping,
            "totalRows": len(students),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=f"File upload error: {str(e)}")


# ─── Main ──────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
