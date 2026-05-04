"""
Variance Engine for Quiz Battle Questions.

Applies per-session variance techniques via DeepSeek,
with pure-Python fallback for choice shuffling.
"""

import json
import random
import re
from typing import List, Dict

from services.ai_client import get_deepseek_client, CHAT_MODEL
from services.question_bank_service import get_cached_session, cache_session_questions


def _fallback_shuffle(questions: List[Dict], seed: int) -> List[Dict]:
    """
    Pure-Python fallback: shuffle choices deterministically.
    """
    rng = random.Random(seed)
    for q in questions:
        choices = q["choices"].copy()
        correct_letter = q["correct_answer"]
        correct_index = ord(correct_letter) - ord("A")
        correct_text = choices[correct_index]
        rng.shuffle(choices)
        q["choices"] = choices
        q["correct_answer"] = chr(ord("A") + choices.index(correct_text))
        q["variance_applied"] = ["choice_shuffle"]
    return questions


async def apply_variance(questions: List[Dict], session_id: str) -> List[Dict]:
    """
    Apply per-session variance to a list of questions.

    1. Check 24h Firestore cache first
    2. Call DeepSeek with variance prompt
    3. Parse JSON response
    4. Fall back to pure-Python shuffle if DeepSeek fails
    5. Cache result for 24 hours
    """
    # 1. Check cache
    cached = await get_cached_session(session_id)
    if cached:
        return cached

    # 2. Generate deterministic seed from session_id
    seed = hash(session_id) % (2**32)

    # 3. Call DeepSeek
    client = get_deepseek_client()
    system_prompt = (
        "You are a math quiz variance engine for MathPulse AI, an educational platform for "
        "Filipino high school students following the DepEd K-12 curriculum. "
        "Your job is to make quiz questions feel fresh each session WITHOUT changing the "
        "correct answer or difficulty level."
    )

    user_prompt = f"""Given these {len(questions)} quiz battle questions as JSON:
{json.dumps(questions, indent=2)}

Apply the following variance techniques. Use session_seed={seed} for deterministic but varied output:

PARAPHRASE (30% chance per question): Reword the question stem using different phrasing, synonyms, or sentence structure. Do NOT change the math or the answer.

CHOICE SHUFFLE (always): Randomize the order of answer choices A/B/C/D. Update "correct_answer" to reflect the new position.

DISTRACTOR REFRESH (20% chance per question): Replace 1-2 wrong choices with new plausible-but-incorrect distractors that represent common student misconceptions for this topic. Keep the correct answer unchanged.

CONTEXT SWAP (10% chance per question): Replace real-world context variables (names, objects, currencies) with Filipino-localized equivalents (e.g., "pesos", "jeepney", "barangay") to increase cultural relevance.

NUMERIC SCALING (10% chance, only for computation problems): Scale numbers by a small integer factor (2x or 3x) so the method remains the same but the answer changes. Recompute the correct answer and all distractors accordingly.

Return the full modified questions array as valid JSON only. Keep all original fields.
Add a "variance_applied": ["paraphrase", "distractor_refresh", ...] field per question.
Do NOT change "topic", "difficulty", "grade_level", or "source_chunk_id"."""

    try:
        response = client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.5,
            max_tokens=4000,
        )
        content = response.choices[0].message.content.strip()
        # Strip markdown code fences
        content = re.sub(r"^```json\s*", "", content)
        content = re.sub(r"\s*```$", "", content)
        varied_questions = json.loads(content)

        if not isinstance(varied_questions, list) or len(varied_questions) != len(questions):
            raise ValueError("Invalid response format from DeepSeek")

        # Validate required fields
        for q in varied_questions:
            if not all(k in q for k in ("question", "choices", "correct_answer", "variance_applied")):
                raise ValueError("Missing required fields in varied question")

    except Exception as e:
        print(f"[variance_engine] DeepSeek variance failed, falling back to shuffle: {e}")
        varied_questions = _fallback_shuffle(questions, seed)

    # 4. Cache for 24 hours
    # Extract player_ids, grade_level, topic from original questions if available
    player_ids = []
    grade_level = questions[0].get("grade_level", 11) if questions else 11
    topic = questions[0].get("topic", "general_mathematics") if questions else "general_mathematics"
    await cache_session_questions(session_id, varied_questions, player_ids, grade_level, topic)

    return varied_questions
