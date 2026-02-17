"""
MathPulse AI - FastAPI Backend
AI-powered math tutoring backend using Hugging Face models.
- Qwen/Qwen2.5-3B-Instruct for chat, learning paths, and insights
- facebook/bart-large-mnli for student risk classification
"""

import os
import io
import json
import logging
from typing import List, Optional

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

# ─── Configuration ─────────────────────────────────────────────

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mathpulse")

HF_TOKEN = os.environ.get("HUGGING_FACE_API_TOKEN", os.environ.get("HF_TOKEN", ""))
CHAT_MODEL = "Qwen/Qwen2.5-3B-Instruct"
RISK_MODEL = "facebook/bart-large-mnli"

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


class ChatResponse(BaseModel):
    response: str


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


MATH_TUTOR_SYSTEM_PROMPT = """You are MathPulse AI, a friendly and expert math tutor for students. You help with:
- Algebra, Geometry, Calculus, Trigonometry, Statistics, and all math topics
- Step-by-step problem solving with clear explanations
- Practice problems and concept reinforcement
- Building confidence in mathematics

Guidelines:
1. Break down complex problems into clear, numbered steps
2. Use mathematical notation where helpful (e.g., x², √, π)
3. Encourage students and celebrate their progress
4. If a student is struggling, try explaining from a different angle
5. Ask follow-up questions to check understanding
6. Keep responses focused and concise (under 300 words unless a detailed derivation is needed)
7. Use examples relatable to students' daily life when possible"""


@app.post("/api/chat", response_model=ChatResponse)
async def chat_tutor(request: ChatRequest):
    """AI Math Tutor powered by Qwen/Qwen2.5-3B-Instruct"""
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
            temperature=0.7,
            top_p=0.9,
        )

        answer = response.choices[0].message.content or ""
        return ChatResponse(response=answer)

    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Chat service error: {str(e)}")


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
        import pandas as pd

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
