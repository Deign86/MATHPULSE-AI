"""
Memory Service for MathPulse AI — hybrid memory architecture.

Layers:
1. Working Memory (LangChain FirestoreChatMessageHistory) — session turns
2. Persistent Profile Memory (Firestore doc) — long-term student profile
3. Episodic / Session Memory (Firestore doc) — session summaries
4. Active State (Firestore doc) — current topic, problem, unresolved context
5. Retrieval Pipeline — collect_memory_context()
6. Update Pipeline — profile updates, session summaries, pruning
"""

import os
import re
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# ─── Lazy Firebase Init ──────────────────────────────────────
# Follows existing pattern from main.py

_firestore_client = None

def _get_firestore():
    global _firestore_client
    if _firestore_client is not None:
        return _firestore_client
    try:
        import firebase_admin
        from firebase_admin import firestore as _fs
        if firebase_admin._apps:
            _firestore_client = _fs.client()
        return _firestore_client
    except Exception:
        logger.debug("Firestore not available for memory service")
        return None

def _has_firestore():
    return _get_firestore() is not None

# ─── Constants ───────────────────────────────────────────────

MAX_HISTORY_TOKENS = 4000  # Max tokens for working memory turns
PROFILE_DOC_PATH = "tutorMemory/profile/current"
SESSION_COLLECTION = "tutorMemory/sessions"
WORKING_COLLECTION = "tutorMemory/working"
ACTIVE_STATE_DOC = "tutorMemory/working/active_state"
MEMORY_CONTEXT_TEMPLATE = """MEMORY CONTEXT — Previous conversation, student profile, and tutoring state:

{content}

Use this context to provide personalized, continuous tutoring."""

# ─── Data Types ──────────────────────────────────────────────

class WorkingMemoryState:
    """Active tutoring session state stored in Firestore."""
    def __init__(self, session_id: str = "", active_topic: str = "",
                 current_problem: str = "", turn_count: int = 0,
                 unresolved_context: Optional[List[str]] = None,
                 corrections: Optional[List[str]] = None):
        self.session_id = session_id
        self.active_topic = active_topic
        self.current_problem = current_problem
        self.turn_count = turn_count
        self.unresolved_context = unresolved_context or []
        self.corrections = corrections or []

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "active_topic": self.active_topic,
            "current_problem": self.current_problem,
            "turn_count": self.turn_count,
            "unresolved_context": self.unresolved_context,
            "corrections": self.corrections,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

    @classmethod
    def from_dict(cls, data: dict) -> "WorkingMemoryState":
        return cls(
            session_id=data.get("session_id", ""),
            active_topic=data.get("active_topic", ""),
            current_problem=data.get("current_problem", ""),
            turn_count=data.get("turn_count", 0),
            unresolved_context=data.get("unresolved_context", []),
            corrections=data.get("corrections", []),
        )


class ProfileMemory:
    """Long-term student profile stored in Firestore."""
    def __init__(self, preferred_name: str = "", grade_level: str = "",
                 strand: str = "", weak_topics: Optional[List[str]] = None,
                 learning_style: str = "", explanation_depth: str = "auto",
                 language_tone: str = "english", prior_goals: Optional[List[str]] = None,
                 stable_tutoring_facts: Optional[List[str]] = None,
                 recurring_mistakes: Optional[List[str]] = None):
        self.preferred_name = preferred_name
        self.grade_level = grade_level
        self.strand = strand
        self.weak_topics = weak_topics or []
        self.learning_style = learning_style
        self.explanation_depth = explanation_depth  # "auto", "basic", "detailed", "advanced"
        self.language_tone = language_tone  # "english", "filipino-friendly"
        self.prior_goals = prior_goals or []
        self.stable_tutoring_facts = stable_tutoring_facts or []
        self.recurring_mistakes = recurring_mistakes or []

    def to_dict(self) -> dict:
        return {
            "preferred_name": self.preferred_name,
            "grade_level": self.grade_level,
            "strand": self.strand,
            "weak_topics": self.weak_topics,
            "learning_style": self.learning_style,
            "explanation_depth": self.explanation_depth,
            "language_tone": self.language_tone,
            "prior_goals": self.prior_goals,
            "stable_tutoring_facts": self.stable_tutoring_facts,
            "recurring_mistakes": self.recurring_mistakes,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

    @classmethod
    def from_dict(cls, data: dict) -> "ProfileMemory":
        return cls(
            preferred_name=data.get("preferred_name", ""),
            grade_level=data.get("grade_level", ""),
            strand=data.get("strand", ""),
            weak_topics=data.get("weak_topics", []),
            learning_style=data.get("learning_style", ""),
            explanation_depth=data.get("explanation_depth", "auto"),
            language_tone=data.get("language_tone", "english"),
            prior_goals=data.get("prior_goals", []),
            stable_tutoring_facts=data.get("stable_tutoring_facts", []),
            recurring_mistakes=data.get("recurring_mistakes", []),
        )


class SessionSummary:
    """Episodic memory — summary of a completed tutoring session."""
    def __init__(self, session_id: str = "", topics_covered: Optional[List[str]] = None,
                 what_learned: Optional[List[str]] = None,
                 what_struggled: Optional[List[str]] = None,
                 unfinished_items: Optional[List[str]] = None,
                 summary: str = "", session_start: str = "",
                 session_end: str = "", turn_count: int = 0,
                 competency_progress: Optional[List[str]] = None):
        self.session_id = session_id
        self.topics_covered = topics_covered or []
        self.what_learned = what_learned or []
        self.what_struggled = what_struggled or []
        self.unfinished_items = unfinished_items or []
        self.summary = summary
        self.session_start = session_start
        self.session_end = session_end
        self.turn_count = turn_count
        self.competency_progress = competency_progress or []

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "topics_covered": self.topics_covered,
            "what_learned": self.what_learned,
            "what_struggled": self.what_struggled,
            "unfinished_items": self.unfinished_items,
            "summary": self.summary,
            "session_start": self.session_start,
            "session_end": self.session_end,
            "turn_count": self.turn_count,
            "competency_progress": self.competency_progress,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

    @classmethod
    def from_dict(cls, data: dict) -> "SessionSummary":
        return cls(
            session_id=data.get("session_id", ""),
            topics_covered=data.get("topics_covered", []),
            what_learned=data.get("what_learned", []),
            what_struggled=data.get("what_struggled", []),
            unfinished_items=data.get("unfinished_items", []),
            summary=data.get("summary", ""),
            session_start=data.get("session_start", ""),
            session_end=data.get("session_end", ""),
            turn_count=data.get("turn_count", 0),
            competency_progress=data.get("competency_progress", []),
        )


# ═══════════════════════════════════════════════════════════════
# 1. WORKING MEMORY — LangChain FirestoreChatMessageHistory
# ═══════════════════════════════════════════════════════════════

def get_working_memory(uid: str, session_id: str):
    """Get LangChain FirestoreChatMessageHistory for the session.
    Returns None if LangChain or Firestore unavailable (graceful degradation)."""
    try:
        from langchain_google_firestore import FirestoreChatMessageHistory
        client = _get_firestore()
        if client is None:
            return None
        return FirestoreChatMessageHistory(
            collection="users",
            doc=f"{uid}/tutorMemory/working",
            session_id=session_id,
            firestore_client=client,
        )
    except ImportError:
        logger.debug("langchain-google-firestore not installed — working memory disabled")
        return None
    except Exception as e:
        logger.debug(f"Failed to initialize working memory: {e}")
        return None


def load_recent_turns(
    uid: str, session_id: str, max_tokens: int = MAX_HISTORY_TOKENS
) -> List[Dict[str, str]]:
    """Load recent conversation turns within token budget.
    Returns list of dicts with 'role' and 'content' keys.
    Falls back to active_state stored turns if LangChain unavailable."""
    try:
        wm = get_working_memory(uid, session_id)
        if wm is not None:
            all_messages = wm.messages
            selected = _select_within_token_budget(all_messages, max_tokens)
            result = []
            for msg in selected:
                role = "assistant" if msg.type == "ai" else msg.type
                result.append({"role": role, "content": msg.content})
            return result

        # Fallback: load from active state stored messages
        state = get_active_state(uid, session_id)
        stored = _get_stored_turns(uid, session_id)
        return _select_within_token_budget_dict(stored, max_tokens)

    except Exception as e:
        logger.debug(f"Failed to load recent turns: {e}")
        return []


def persist_turns(uid: str, session_id: str, messages: List[Dict[str, str]]) -> None:
    """Append messages to working memory. Fire-and-forget."""
    try:
        wm = get_working_memory(uid, session_id)
        if wm is not None:
            from langchain.schema import HumanMessage, AIMessage
            for msg in messages:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if not content:
                    continue
                if role == "assistant":
                    wm.add_message(AIMessage(content=content))
                elif role == "user":
                    wm.add_message(HumanMessage(content=content))

        # Also store raw turns in Firestore for fallback
        _append_stored_turns(uid, session_id, messages)

    except ImportError:
        _append_stored_turns(uid, session_id, messages)
    except Exception as e:
        logger.debug(f"Failed to persist turns: {e}")


def _stored_turns_ref(uid: str, session_id: str):
    """Get Firestore doc reference for stored turns."""
    try:
        db = _get_firestore()
        if db is None:
            return None
        return db.collection("users").document(uid).collection(WORKING_COLLECTION).document(session_id)
    except Exception:
        return None


def _get_stored_turns(uid: str, session_id: str) -> List[Dict[str, str]]:
    """Get raw stored turns from Firestore fallback."""
    try:
        ref = _stored_turns_ref(uid, session_id)
        if ref is None:
            return []
        doc = ref.get()
        if doc.exists:
            data = doc.to_dict() or {}
            return data.get("turns", [])
        return []
    except Exception as e:
        logger.debug(f"Failed to get stored turns: {e}")
        return []


def _append_stored_turns(uid: str, session_id: str, new_turns: List[Dict[str, str]]) -> None:
    """Append turns to Firestore fallback storage."""
    try:
        ref = _stored_turns_ref(uid, session_id)
        if ref is None:
            return
        # Use arrayUnion for atomic append
        from google.cloud.firestore import ArrayUnion
        ref.set({
            "turns": ArrayUnion(new_turns),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }, merge=True)
    except Exception as e:
        logger.debug(f"Failed to append stored turns: {e}")


def _select_within_token_budget(messages: list, max_tokens: int) -> list:
    """Select messages from end to fit within token budget (rough char/4 estimate)."""
    total = 0
    selected = []
    for msg in reversed(messages):
        estimated = len(msg.content) // 4  # rough token estimate
        if total + estimated > max_tokens and total > 0:
            break
        total += estimated
        selected.insert(0, msg)
    return selected


def _select_within_token_budget_dict(messages: List[Dict], max_tokens: int) -> List[Dict]:
    """Same as above but for dict messages."""
    total = 0
    selected = []
    for msg in reversed(messages):
        estimated = len(msg.get("content", "")) // 4
        if total + estimated > max_tokens and total > 0:
            break
        total += estimated
        selected.insert(0, msg)
    return selected


# ═══════════════════════════════════════════════════════════════
# 2. ACTIVE STATE — Current topic, problem, unresolved context
# ═══════════════════════════════════════════════════════════════

def get_active_state(uid: str, session_id: str) -> Optional[WorkingMemoryState]:
    """Load the active tutoring state for the session."""
    try:
        db = _get_firestore()
        if db is None:
            return None
        doc = db.collection("users").document(uid).collection(WORKING_COLLECTION).document("active_state").get()
        if doc.exists:
            data = doc.to_dict() or {}
            # Filter by session_id to handle multiple sessions
            if data.get("session_id") == session_id:
                return WorkingMemoryState.from_dict(data)
        return None
    except Exception as e:
        logger.debug(f"Failed to load active state: {e}")
        return None


def set_active_state(uid: str, session_id: str, state: WorkingMemoryState) -> None:
    """Save the active tutoring state for the session."""
    try:
        db = _get_firestore()
        if db is None:
            return
        state.session_id = session_id
        db.collection("users").document(uid).collection(WORKING_COLLECTION).document("active_state").set(
            state.to_dict(), merge=True
        )
    except Exception as e:
        logger.debug(f"Failed to save active state: {e}")


def increment_turn_count(uid: str, session_id: str) -> int:
    """Atomically increment turn count and return new value."""
    try:
        db = _get_firestore()
        if db is None:
            return 0
        doc_ref = db.collection("users").document(uid).collection(WORKING_COLLECTION).document("active_state")
        doc = doc_ref.get()
        current = doc.to_dict().get("turn_count", 0) if doc.exists else 0
        new_count = current + 1
        doc_ref.set({
            "session_id": session_id,
            "turn_count": new_count,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }, merge=True)
        return new_count
    except Exception as e:
        logger.debug(f"Failed to increment turn count: {e}")
        return 0


def update_active_topic(uid: str, session_id: str, topic: str) -> None:
    """Update the current tutoring topic."""
    try:
        db = _get_firestore()
        if db is None:
            return
        db.collection("users").document(uid).collection(WORKING_COLLECTION).document("active_state").set({
            "session_id": session_id,
            "active_topic": topic,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }, merge=True)
    except Exception as e:
        logger.debug(f"Failed to update active topic: {e}")


def update_current_problem(uid: str, session_id: str, problem: str) -> None:
    """Update the current problem being solved."""
    try:
        db = _get_firestore()
        if db is None:
            return
        db.collection("users").document(uid).collection(WORKING_COLLECTION).document("active_state").set({
            "session_id": session_id,
            "current_problem": problem,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }, merge=True)
    except Exception as e:
        logger.debug(f"Failed to update current problem: {e}")


# ═══════════════════════════════════════════════════════════════
# 3. PERSISTENT PROFILE MEMORY
# ═══════════════════════════════════════════════════════════════

def load_profile(uid: str) -> Optional[ProfileMemory]:
    """Load student profile memory from Firestore."""
    try:
        db = _get_firestore()
        if db is None:
            return None
        doc = db.collection("users").document(uid).collection("tutorMemory").document("profile").get()
        if doc.exists:
            return ProfileMemory.from_dict(doc.to_dict() or {})
        return None
    except Exception as e:
        logger.debug(f"Failed to load profile: {e}")
        return None


def upsert_profile(uid: str, profile: ProfileMemory) -> None:
    """Save or update profile memory. All fields merge (never delete)."""
    try:
        db = _get_firestore()
        if db is None:
            return
        db.collection("users").document(uid).collection("tutorMemory").document("profile").set(
            profile.to_dict(), merge=True
        )
    except Exception as e:
        logger.debug(f"Failed to save profile: {e}")


def extract_profile_info_from_message(text: str) -> dict:
    """Heuristic extraction of profile info from student messages.
    Uses simple regex patterns — not AI. Returns dict of detected fields."""
    updates = {}
    
    # Preferred name: "my name is X", "I'm X", "call me X"
    name_patterns = [
        r"(?:my\s+name\s+is|i'm|i\s+am|call\s+me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
    ]
    for pat in name_patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m and not _is_negative_context(text, m.start()):
            name = m.group(1).strip()
            if len(name) > 1 and len(name) < 50:
                updates["preferred_name"] = name
                break

    # Grade level: "Grade X", "I'm in Grade X", "Grade 11-STEM"
    grade_patterns = [
        r"(?:grade\s*)(\d{1,2})",
        r"(?:i'?m?\s+(?:in\s+)?)?grade\s*[–\-]?\s*(\d{1,2})\s*(?:[–\-]\s*\d{1,2})?(?:\s*(STEM|ABM|HUMSS|GAS|TVL))?",
    ]
    for pat in grade_patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            grade_num = m.group(1)
            if grade_num in {"11", "12", "9", "10", "7", "8"}:
                strand = m.group(2) if m.lastindex and m.group(2) else ""
                updates["grade_level"] = f"Grade {grade_num}"
                if strand:
                    updates["strand"] = strand.upper()
                break

    # Weak topics: "I struggle with X", "I don't understand X", "I always get confused by X"
    weak_patterns = [
        r"(?:struggle\s+with|don'?t\s+(?:understand|get)\s+|confused\s+(?:by|about|with)\s+|weak\s+(?:in|at|on)\s+|hard\s+time\s+(?:with|on)\s+|bad\s+at\s+)([^.!?]{3,60})",
    ]
    for pat in weak_patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            topic = m.group(1).strip().lower()
            if len(topic) > 2 and not _is_negative_context(text, m.start()):
                if "weak_topics" not in updates:
                    updates["weak_topics"] = []
                updates["weak_topics"].append(topic)

    # Learning style / preference
    style_patterns = [
        (r"(?:prefer|like|want)\s+(step[-\s]by[-\s]step|detailed|simple|short|long|visual|example)", "explanation_depth"),
        (r"(?:keep|make)\s+(?:it\s+)?(?:short|simple|brief|concise)", "explanation_depth"),
    ]
    for pat, field in style_patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            if field == "explanation_depth":
                matched = m.group(1).lower() if m.lastindex else ""
                if matched in ("simple", "short", "brief", "concise"):
                    updates[field] = "basic"
                elif matched in ("detailed", "long", "step-by-step"):
                    updates[field] = "detailed"
                else:
                    updates[field] = matched

    # Language preference
    if re.search(r"(?:tagalog|filipino|bisaya|ilocano)", text, re.IGNORECASE):
        updates["language_tone"] = "filipino-friendly"

    return updates


def _is_negative_context(text: str, pos: int) -> bool:
    """Check if the position is in a negative context like 'I don't have a name'."""
    surrounding = text[max(0, pos-30):pos+30].lower()
    negative_triggers = ["don't have", "not my", "not sure", "don't know", "no name"]
    for trigger in negative_triggers:
        if trigger in surrounding:
            return True
    return False


def update_profile_from_chat(uid: str, user_message: str) -> None:
    """Detect profile-relevant info in user message and update Firestore.
    Called asynchronously after each chat response."""
    try:
        updates = extract_profile_info_from_message(user_message)
        if not updates:
            return

        profile = load_profile(uid)
        if profile is None:
            profile = ProfileMemory()

        if "preferred_name" in updates and not profile.preferred_name:
            profile.preferred_name = updates["preferred_name"]
        if "grade_level" in updates and not profile.grade_level:
            profile.grade_level = updates["grade_level"]
        if "strand" in updates and not profile.strand:
            profile.strand = updates["strand"]
        if "weak_topics" in updates:
            for topic in updates["weak_topics"]:
                if topic not in profile.weak_topics:
                    profile.weak_topics.append(topic)
        if "explanation_depth" in updates:
            profile.explanation_depth = updates["explanation_depth"]
        if "language_tone" in updates:
            profile.language_tone = updates["language_tone"]

        upsert_profile(uid, profile)
        # Extract stable tutoring fact if profile was updated meaningfully
        if updates:
            _maybe_record_stable_fact(uid, profile, user_message)

    except Exception as e:
        logger.debug(f"Failed to update profile from chat: {e}")


def _maybe_record_stable_fact(uid: str, profile: ProfileMemory, message: str) -> None:
    """Record a stable tutoring fact when student reveals important info."""
    facts_to_record = []
    
    if profile.weak_topics:
        facts_to_record.append(f"Student struggles with: {', '.join(profile.weak_topics[-3:])}")
    if profile.explanation_depth and profile.explanation_depth != "auto":
        facts_to_record.append(f"Student prefers {profile.explanation_depth} explanations")
    if profile.language_tone == "filipino-friendly":
        facts_to_record.append("Student prefers Filipino-friendly language")

    if facts_to_record:
        for fact in facts_to_record:
            if fact not in profile.stable_tutoring_facts:
                profile.stable_tutoring_facts.append(fact)


# ═══════════════════════════════════════════════════════════════
# 4. EPISODIC / SESSION MEMORY
# ═══════════════════════════════════════════════════════════════

def load_session_summary(uid: str, session_id: str) -> Optional[SessionSummary]:
    """Load session summary from Firestore."""
    try:
        db = _get_firestore()
        if db is None:
            return None
        doc = db.collection("users").document(uid).collection(SESSION_COLLECTION).document(session_id).get()
        if doc.exists:
            return SessionSummary.from_dict(doc.to_dict() or {})
        return None
    except Exception as e:
        logger.debug(f"Failed to load session summary: {e}")
        return None


def load_latest_session_summary(uid: str, exclude_session_id: str = "") -> Optional[SessionSummary]:
    """Load the most recent previous session summary, excluding current session."""
    try:
        db = _get_firestore()
        if db is None:
            return None
        docs = (
            db.collection("users").document(uid).collection(SESSION_COLLECTION)
            .order_by("created_at", direction="DESCENDING")
            .limit(5)
            .get()
        )
        for doc in docs:
            data = doc.to_dict() or {}
            if data.get("session_id") != exclude_session_id:
                return SessionSummary.from_dict(data)
        return None
    except Exception as e:
        logger.debug(f"Failed to load latest session summary: {e}")
        return None


def generate_session_summary(uid: str, session_id: str, messages: List[Dict[str, str]]) -> SessionSummary:
    """Generate a structured session summary from conversation messages.
    Uses content analysis rather than AI call to keep it fast and cheap."""
    try:
        topics_covered = set()
        struggles = []
        learned = []
        summary_parts = []

        for msg in messages:
            role = msg.get("role", "")
            content = msg.get("content", "")

            if role == "user":
                # Detect topics from user messages (look for math keywords)
                topic = _detect_topic(content)
                if topic:
                    topics_covered.add(topic)
                # Detect struggles
                if re.search(r"(?:don'?t\s+understand|confused|struggl|hard|difficult)", content, re.IGNORECASE):
                    struggles.append(content[:100])

            elif role == "assistant":
                # Detect topics from assistant explanations
                topic = _detect_topic(content)
                if topic:
                    topics_covered.add(topic)
                # Look for teaching signals
                if "correct" in content.lower() and "good" in content.lower():
                    learned.append(content[:100])

        # Build summary
        covered = list(topics_covered)[:10]
        summary_text = f"Session covered: {', '.join(covered) if covered else 'general math topics'}."
        if struggles:
            summary_text += f" Student struggled with {len(struggles)} concepts."
        if learned:
            summary_text += f" Demonstrated understanding of {len(learned)} concepts."

        return SessionSummary(
            session_id=session_id,
            topics_covered=covered,
            what_struggled=struggles[:5],
            what_learned=learned[:5],
            summary=summary_text,
            session_start=datetime.now(timezone.utc).isoformat(),
            session_end=datetime.now(timezone.utc).isoformat(),
            turn_count=len(messages) // 2,
        )
    except Exception as e:
        logger.debug(f"Failed to generate session summary: {e}")
        return SessionSummary(session_id=session_id, summary="Session summary unavailable.")


_DETECTED_TOPICS = {
    "algebra": r"\b(algebra|equation|inequalit|polynomial|factor|quadratic|linear)",
    "arithmetic": r"\b(arithmetic|addition|subtract|multiply|division|fraction|decimal|percent)",
    "geometry": r"\b(geometry|angle|triangle|circle|polygon|area|perimeter|volume)",
    "trigonometry": r"\b(trig|sin|cos|tan|sine|cosine|tangent|identity)",
    "statistics": r"\b(statistic|mean|median|mode|probability|distribution|variance|standard.dev)",
    "calculus": r"\b(calculus|derivative|integral|limit|differentiat|optimization)",
    "functions": r"\b(function|domain|range|composition|inverse|piecewise)",
    "matrices": r"\b(matrix|determinant|inverse|transpose|linear.equation)",
    "business_math": r"\b(interest|loan|investment|profit|loss|markup|discount|commission|tax)",
    "logic": r"\b(logic|proposition|truth|table|argument|premise|conclusion)",
}


def _detect_topic(text: str) -> str:
    """Detect math topic from text content."""
    text_lower = text.lower()
    for topic, pattern in _DETECTED_TOPICS.items():
        if re.search(pattern, text_lower):
            return topic
    return ""


def save_session_summary(uid: str, summary: SessionSummary) -> None:
    """Save session summary to Firestore."""
    try:
        db = _get_firestore()
        if db is None:
            return
        db.collection("users").document(uid).collection(SESSION_COLLECTION).document(
            summary.session_id
        ).set(summary.to_dict(), merge=True)
    except Exception as e:
        logger.debug(f"Failed to save session summary: {e}")


def finalize_session(uid: str, session_id: str, messages: List[Dict[str, str]]) -> None:
    """Generate and save session summary at session end.
    Safe to call multiple times — updates existing summary."""
    try:
        summary = generate_session_summary(uid, session_id, messages)
        save_session_summary(uid, summary)
    except Exception as e:
        logger.debug(f"Failed to finalize session: {e}")


# ═══════════════════════════════════════════════════════════════
# 5. MEMORY RETRIEVAL PIPELINE
# ═══════════════════════════════════════════════════════════════

# Rate at which we auto-summarize sessions (every N turns)
AUTO_SUMMARIZE_INTERVAL = 15


async def collect_memory_context(
    uid: str, session_id: str, current_message: str,
    include_profile: bool = True, include_recent_turns: bool = True,
    include_active_state: bool = True, include_previous_session: bool = True,
) -> str:
    """Collect all memory sources into a formatted context string.
    This is injected into the system prompt before the tutor instructions.
    
    Returns empty string if no memory available (graceful degradation)."""
    try:
        context_parts = []

        # 1. Profile memory
        if include_profile:
            profile = load_profile(uid)
            if profile:
                context_parts.append(_format_profile_context(profile))

        # 2. Active state
        if include_active_state:
            state = get_active_state(uid, session_id)
            if state and (state.active_topic or state.current_problem):
                context_parts.append(_format_active_state(state))

        # 3. Previous session summary (for continuity across sessions)
        if include_previous_session:
            prev_summary = load_latest_session_summary(uid, exclude_session_id=session_id)
            if prev_summary:
                context_parts.append(_format_previous_session(prev_summary))

        # 4. Recent turns
        if include_recent_turns:
            recent = load_recent_turns(uid, session_id, max_tokens=2000)
            if recent:
                context_parts.append(_format_recent_turns(recent))

        if not context_parts:
            return ""

        combined = "\n\n".join(context_parts)
        return MEMORY_CONTEXT_TEMPLATE.format(content=combined)

    except Exception as e:
        logger.debug(f"Failed to collect memory context: {e}")
        return ""


def _format_profile_context(profile: ProfileMemory) -> str:
    """Format profile memory for prompt injection."""
    lines = ["=== STUDENT PROFILE ==="]
    if profile.preferred_name:
        lines.append(f"Name: {profile.preferred_name}")
    if profile.grade_level:
        lines.append(f"Grade Level: {profile.grade_level}")
    if profile.strand:
        lines.append(f"Strand: {profile.strand}")
    if profile.weak_topics:
        lines.append(f"Weak Topics: {', '.join(profile.weak_topics[:5])}")
    if profile.explanation_depth and profile.explanation_depth != "auto":
        lines.append(f"Explanation Preference: {profile.explanation_depth} explanations")
    if profile.language_tone and profile.language_tone != "english":
        lines.append(f"Language: {profile.language_tone}")
    if profile.stable_tutoring_facts:
        lines.append(f"Tutoring Facts: {'; '.join(profile.stable_tutoring_facts[-3:])}")
    if profile.prior_goals:
        lines.append(f"Prior Goals: {'; '.join(profile.prior_goals[-3:])}")
    if profile.recurring_mistakes:
        lines.append(f"Watch For: Student tends to {profile.recurring_mistakes[-1]}")
    return "\n".join(lines)


def _format_active_state(state: WorkingMemoryState) -> str:
    """Format active tutoring state for prompt injection."""
    lines = ["=== CURRENT SESSION STATE ==="]
    if state.active_topic:
        lines.append(f"Current Topic: {state.active_topic}")
    if state.current_problem:
        lines.append(f"Current Problem: {state.current_problem}")
    if state.turn_count:
        lines.append(f"Turn Count: {state.turn_count}")
    if state.unresolved_context:
        lines.append(f"Unresolved: {'; '.join(state.unresolved_context[-3:])}")
    if state.corrections:
        lines.append(f"Recent Corrections: {'; '.join(state.corrections[-2:])}")
    return "\n".join(lines)


def _format_previous_session(prev: SessionSummary) -> str:
    """Format previous session summary for prompt injection."""
    lines = ["=== PREVIOUS SESSION ==="]
    if prev.summary:
        lines.append(f"Summary: {prev.summary}")
    if prev.topics_covered:
        lines.append(f"Topics Covered: {', '.join(prev.topics_covered)}")
    if prev.what_struggled:
        lines.append(f"Previously Struggled: {len(prev.what_struggled)} concepts")
    if prev.unfinished_items:
        lines.append(f"Unfinished: {'; '.join(prev.unfinished_items[:3])}")
    return "\n".join(lines)


def _format_recent_turns(turns: List[Dict[str, str]]) -> str:
    """Format recent conversation turns for prompt injection."""
    if not turns:
        return ""
    lines = ["=== RECENT CONVERSATION ==="]
    for turn in turns[-10:]:  # Last 10 turns max
        role = turn.get("role", "user")
        content = turn.get("content", "")
        prefix = "Student" if role == "user" else "Tutor"
        content_trimmed = content[:300] if content else ""
        lines.append(f"{prefix}: {content_trimmed}")
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════
# 6. MEMORY UPDATE PIPELINE
# ═══════════════════════════════════════════════════════════════

async def update_memory_after_response(
    uid: str, session_id: str, user_message: str,
    ai_response: str, turn_count: int,
) -> None:
    """Update all memory layers after a chat response.
    Called asynchronously — never blocks the response.
    
    Updates:
    1. Working memory (persist turns)
    2. Active state (increment turn count)
    3. Profile (extract info from user message)
    4. Session summary (auto-summarize every N turns)"""
    try:
        # 1. Persist turns to working memory
        persist_turns(uid, session_id, [
            {"role": "user", "content": user_message},
            {"role": "assistant", "content": ai_response},
        ])

        # 2. Update active state
        increment_turn_count(uid, session_id)

        # 3. Update profile from chat (heuristic extraction)
        update_profile_from_chat(uid, user_message)

        # 4. Auto-summarize at interval
        if turn_count > 0 and turn_count % AUTO_SUMMARIZE_INTERVAL == 0:
            recent = load_recent_turns(uid, session_id, max_tokens=0)  # get all
            # Convert to dict format
            all_turns = []
            for turn in recent:
                all_turns.append(turn if isinstance(turn, dict) else {"role": "assistant", "content": str(turn)})
            all_turns.append({"role": "user", "content": user_message})
            all_turns.append({"role": "assistant", "content": ai_response})
            finalize_session(uid, session_id, all_turns)

    except Exception as e:
        logger.debug(f"Background memory update failed (non-fatal): {e}")


# ═══════════════════════════════════════════════════════════════
# 7. PRUNING & CLEANUP
# ═══════════════════════════════════════════════════════════════

def prune_working_memory(uid: str, session_id: str, max_turns: int = 100) -> None:
    """Keep only the most recent turns in working memory to prevent bloat."""
    try:
        db = _get_firestore()
        if db is None:
            return
        ref = db.collection("users").document(uid).collection(WORKING_COLLECTION).document(session_id)
        doc = ref.get()
        if not doc.exists:
            return
        data = doc.to_dict() or {}
        turns = data.get("turns", [])
        if len(turns) > max_turns:
            pruned = turns[-max_turns:]
            ref.update({"turns": pruned, "pruned_at": datetime.now(timezone.utc).isoformat()})
    except Exception as e:
        logger.debug(f"Failed to prune working memory: {e}")


def prune_old_sessions(uid: str, max_sessions: int = 50) -> None:
    """Delete oldest session summaries beyond max_sessions threshold."""
    try:
        db = _get_firestore()
        if db is None:
            return
        docs = (
            db.collection("users").document(uid).collection(SESSION_COLLECTION)
            .order_by("created_at", direction="DESCENDING")
            .offset(max_sessions)
            .get()
        )
        for doc in docs:
            doc.reference.delete()
    except Exception as e:
        logger.debug(f"Failed to prune old sessions: {e}")


def clear_session(uid: str, session_id: str) -> None:
    """Clear all working memory for a session."""
    try:
        db = _get_firestore()
        if db is None:
            return
        batch = db.batch()
        # Clear stored turns
        ref1 = db.collection("users").document(uid).collection(WORKING_COLLECTION).document(session_id)
        batch.delete(ref1)
        # Reset active state if it matches this session
        state_ref = db.collection("users").document(uid).collection(WORKING_COLLECTION).document("active_state")
        state_doc = state_ref.get()
        if state_doc.exists and state_doc.to_dict().get("session_id") == session_id:
            batch.delete(state_ref)
        batch.commit()
    except Exception as e:
        logger.debug(f"Failed to clear session: {e}")


# ═══════════════════════════════════════════════════════════════
# 8. MEMORY AVAILABILITY CHECK
# ═══════════════════════════════════════════════════════════════

def is_memory_available() -> bool:
    """Check if memory system is operational."""
    return _has_firestore()

# ═══════════════════════════════════════════════════════════════
# 9. TIMING & HEALTH MONITORING
# ═══════════════════════════════════════════════════════════════

_TIMING_LOG_ENABLED: bool = True


def _time_ms() -> int:
    """Return current monotonic time in milliseconds."""
    return int(time.monotonic() * 1000)


def log_timing(func_name: str, start_ms: int) -> None:
    """Log the elapsed time of a function call if timing is enabled."""
    if not _TIMING_LOG_ENABLED:
        return
    elapsed = _time_ms() - start_ms
    logger.info(f"TIMING [{func_name}] {elapsed}ms")


def check_memory_health(uid: str) -> dict:
    """Verify that all three memory stores are writable and readable.
    
    Returns a dict with per-store results:
    {
        'firestore_available': bool,
        'profile_writable': {'ok': bool, 'latency_ms': int, 'error': str | None},
        'active_state_writable': {...},
        'session_summary_writable': {...},
    }
    """
    now = _time_ms()
    result: dict = {
        "firestore_available": _has_firestore(),
        "profile_writable": {"ok": False, "latency_ms": 0, "error": None},
        "active_state_writable": {"ok": False, "latency_ms": 0, "error": None},
        "session_summary_writable": {"ok": False, "latency_ms": 0, "error": None},
    }

    if not result["firestore_available"]:
        for key in ("profile_writable", "active_state_writable", "session_summary_writable"):
            result[key]["error"] = "Firestore not initialized"
        result["_elapsed_ms"] = _time_ms() - now
        return result

    db = firebase_admin.firestore.client()
    test_prefix = f"_health_check_test_{int(time.time())}"
    profile_ref = db.collection("users").document(uid).collection("tutorMemory").document("profile")
    active_ref = db.collection("users").document(uid).collection("tutorMemory").document("working").collection("state").document("active_state")
    session_ref = (
        db.collection("users")
        .document(uid)
        .collection("tutorMemory")
        .document("sessions")
        .collection("items")
        .document(f"{test_prefix}")
    )

    # Test profile write
    try:
        t0 = _time_ms()
        profile_ref.set({"stable_facts": {"test_fact": "health_check_ok"}}, merge=True)
        readback = profile_ref.get()
        facts = readback.to_dict().get("stable_facts", {}) if readback.exists else {}
        latency = _time_ms() - t0
        if facts.get("test_fact") == "health_check_ok":
            result["profile_writable"]["ok"] = True
        else:
            result["profile_writable"]["error"] = "Write verification failed"
        result["profile_writable"]["latency_ms"] = latency
        # Cleanup
        profile_ref.update({"stable_facts.test_fact": firestore.DELETE_FIELD})
    except Exception as e:
        result["profile_writable"]["error"] = str(e)
        result["profile_writable"]["latency_ms"] = _time_ms() - t0

    # Test active state write
    try:
        t0 = _time_ms()
        active_ref.set({"active_topic": "health_check_test", "turn_count": 0}, merge=True)
        readback = active_ref.get()
        data = readback.to_dict() if readback.exists else {}
        latency = _time_ms() - t0
        if data.get("active_topic") == "health_check_test":
            result["active_state_writable"]["ok"] = True
        else:
            result["active_state_writable"]["error"] = "Write verification failed"
        result["active_state_writable"]["latency_ms"] = latency
        # Cleanup
        active_ref.update({"active_topic": firestore.DELETE_FIELD, "turn_count": firestore.DELETE_FIELD})
    except Exception as e:
        result["active_state_writable"]["error"] = str(e)
        result["active_state_writable"]["latency_ms"] = _time_ms() - t0

    # Test session summary write
    try:
        t0 = _time_ms()
        session_ref.set({
            "concepts_covered": ["health_check_test"],
            "key_insights": "health check",
            "timestamp": firestore.SERVER_TIMESTAMP,
        })
        readback = session_ref.get()
        data = readback.to_dict() if readback.exists else {}
        latency = _time_ms() - t0
        if data.get("key_insights") == "health check":
            result["session_summary_writable"]["ok"] = True
        else:
            result["session_summary_writable"]["error"] = "Write verification failed"
        result["session_summary_writable"]["latency_ms"] = latency
        # Cleanup
        session_ref.delete()
    except Exception as e:
        result["session_summary_writable"]["error"] = str(e)
        result["session_summary_writable"]["latency_ms"] = _time_ms() - t0

    result["_elapsed_ms"] = _time_ms() - now
    logger.info(f"MEMORY_HEALTH check for uid={uid}: profile={result['profile_writable']['ok']}, "
                f"active={result['active_state_writable']['ok']}, "
                f"session={result['session_summary_writable']['ok']}, "
                f"elapsed={result['_elapsed_ms']}ms")
    return result
