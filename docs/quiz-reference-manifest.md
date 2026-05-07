# Quiz System Reference Manifest

**Generated:** May 7, 2026  
**Branch:** feat/practice-center-quiz (before merge with main)  
**Backup:** backup/latest-practice-center-quiz

---

## Overview

This document captures the current state of the Quiz system in the `feat/practice-center-quiz` branch to preserve knowledge during the merge with `main` branch. The Quiz system consists of three components:

1. **Module Quiz** - Practice quizzes via Practice Center
2. **Practice Center Quiz** - Enhanced quiz experience with gamification
3. **Quiz Battle** - Competitive quiz battles

---

## Part 1: UI/UX Logic

### 1.1 Hint, Reveal, Explain Modals

#### Hint Modal (`QuizExperience.tsx`)
- **Trigger**: "Get Hint" button or keyboard shortcut (H key)
- **Functionality**: Eliminates 2 wrong answer options (for multiple choice)
- **Cost**: Uses a "Key" (key icon) - limited resource
- **Visual**: Shows eliminated options grayed out with strikethrough
- **State**: Track hint usage per question in `usedHints` state

#### Reveal Modal (`QuizExperience.tsx`)
- **Trigger**: "Show Answer" button or keyboard shortcut (R key)
- **Functionality**: Immediately displays the correct answer
- **Cost**: Ends the question, no further attempts allowed
- **Visual**: Large checkmark icon with correct answer highlighted
- **State**: Set `showRevealModal(true)`

#### Explain Modal (`QuizExperience.tsx`)
- **Trigger**: "Explain" button or keyboard shortcut (E key)
- **Functionality**: Shows AI-generated explanation for the answer
- **Cost**: Free to use after answering (correct or incorrect)
- **Visual**: Modal with detailed explanation text, may include math rendering
- **State**: Set `showExplainModal(true)`

### 1.2 Lives Cooldown System

#### Hearts/Lives Mechanics
- **Max Lives**: 15 hearts
- **Initial**: Start with 15 hearts on quiz begin
- **Cost**: Lose 1 heart per incorrect answer
- **Recovery**: Hearts automatically regenerate 1 every 15 minutes
- **UI State**: Track in component state, NOT persisted to backend

#### Cooldown Modal ("Out of Lives")
- **Trigger**: Attempt to answer when hearts = 0
- **Modal Title**: "Out of Lives!"
- **Visual**: Heart icon with countdown timer
- **Countdown**: Shows time until next heart (e.g., "14:59")
- **Timer**: Uses `setInterval` updating every second
- **Actions**:
  - "Wait" - keep modal open, auto-close when heart regenerates
  - "End Quiz" - close quiz, save current progress

#### Implementation Details
```typescript
// State tracking
const [hearts, setHearts] = useState(15);
const [lastHeartLoss, setLastHeartLoss] = useState<Date | null>(null);

// Cooldown calculation
const getNextHeartTime = () => {
  if (!lastHeartLoss) return null;
  const nextTime = new Date(lastHeartLoss.getTime() + 15 * 60 * 1000);
  return nextTime;
};

// Timer for auto-refill
useEffect(() => {
  if (hearts >= 15) return;
  const interval = setInterval(() => {
    const nextHeart = getNextHeartTime();
    if (nextHeart && new Date() >= nextHeart) {
      setHearts(h => Math.min(h + 1, 15));
    }
  }, 1000);
  return () => clearInterval(interval);
}, [hearts, lastHeartLoss]);
```

---

## Part 2: Component Structure

### 2.1 QuizExperience.tsx (Main Quiz Component)

**File:** `src/components/QuizExperience.tsx` (1495 lines)

#### Core State
```typescript
const [currentQuestion, setCurrentQuestion] = useState(0);
const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
const [showHintModal, setShowHintModal] = useState(false);
const [showRevealModal, setShowRevealModal] = useState(false);
const [showExplainModal, setShowExplainModal] = useState(false);
const [showOutOfLivesModal, setShowOutOfLivesModal] = useState(false);
const [hearts, setHearts] = useState(15);
const [streak, setStreak] = useState(0);
const [score, setScore] = useState(0);
const [combo, setCombo] = useState(1);
const [xpEarned, setXpEarned] = useState(0);
const [usedHints, setUsedHints] = useState<Set<number>>(new Set());
const [eliminatedOptions, setEliminatedOptions] = useState<Set<string>>(new Set());
```

#### Key Functions
- `handleAnswerSelect(answer)` - Process answer selection
- `handleReveal()` - Show answer modal
- `handleExplain()` - Show explanation modal
- `handleHint()` - Trigger hint (eliminate options)
- `handleNextQuestion()` - Advance to next question
- `handleQuizComplete()` - Calculate final score, save results
- `calculateXP(score, streak, combo)` - Calculate earned XP

#### Modal Components (Rendered via createPortal)
1. **HintModal** - Option elimination interface
2. **RevealModal** - Correct answer display
3. **ExplainModal** - AI explanation display
4. **OutOfLivesModal** - Hearts cooldown countdown

#### Animations
- **Confetti** (excellent score): Triggered when score >= 90%
- **Rain** (poor score): Triggered when score < 50%
- **Sparks** (good score): Triggered when 50% <= score < 90%
- **Shake**: On incorrect answer
- **Score Pop**: Animated counter for score/XP

### 2.2 InteractiveLesson.tsx (Lesson Quiz)

**File:** `src/components/InteractiveLesson.tsx` (~1000+ lines)

#### Similar State Structure
- Question navigation (currentQuestion index)
- Answer tracking (answers map)
- Hearts/lives system (shared pattern)
- Score/XP calculation

#### Key Differences from QuizExperience
- Embedded in lesson flow (onComplete callback)
- No separate quiz result saving (handled by parent)
- Similar modal structure (Reveal, Explain, OutOfLives)

### 2.3 QuizBattlePage.tsx (Battle Mode)

**File:** `src/components/QuizBattlePage.tsx` (70+ lines changed)

#### Tabs Structure
```typescript
const [activeTab, setActiveTab] = useState<'hub' | 'setup' | 'battle' | 'history' | 'stats' | 'leaderboard'>('hub');
```

#### Key Features
- **Matchmaking Queue**: Join public/private battles
- **Battle Arena**: Real-time question display, timer
- **Opponent Tracking**: Avatar, score, streak indicators
- **Results Modal**: XP earned, momentum, replay option
- **Leaderboard**: Rankings with mode toggle (alias/initials/full)

#### Battle State
```typescript
const [matchState, setMatchState] = useState<{
  status: 'waiting' | 'active' | 'completed';
  opponent: { name: string; avatar: string };
  currentScore: number;
  opponentScore: number;
  round: number;
  totalRounds: number;
} | null>(null);
```

---

## Part 3: Backend Logic (Main Branch)

### 3.1 Quiz Generation API

**File:** `backend/routes/quiz_generation_routes.py`

#### Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/quiz/generate` | POST | AI-powered quiz generation with topics |
| `/api/quiz/preview` | POST | 3-question preview before full generation |
| `/api/quiz/generate-async` | POST | Background quiz generation |
| `/api/quiz/topics` | GET | List available topics |
| `/api/quiz/student-competency` | POST | Get student mastery levels |
| `/api/quiz/adaptive-select` | POST | Select adaptive quiz based on performance |
| `/api/quiz/calibrate-difficulty` | POST | Adjust difficulty based on results |

#### Data Flow
```
User Request → FastAPI → Inference Client → HuggingFace Model
                                    ↓
                              Quiz Generation
                                    ↓
                              Firestore Storage
                                    ↓
                              Frontend Fetch
```

### 3.2 Quiz Battle Backend

**File:** `backend/routes/quiz_battle.py`

#### Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/quiz-battle/create` | POST | Create new battle room |
| `/api/quiz-battle/join` | POST | Join existing room |
| `/api/quiz-battle/submit` | POST | Submit answer during battle |
| `/api/quiz-battle/heartbeat` | POST | Keep session alive |
| `/api/quiz-battle/bot/create` | POST | Create bot match |

### 3.3 Firebase Functions

**File:** `functions/src/triggers/quizBattleApi.ts`

#### Firestore Collections Used
- `quizBattleRooms` - Active battle sessions
- `quizBattleMatches` - Completed matches
- `quizBattleLeaderboard` - Global/segment rankings

#### Real-time Features
- Presence tracking via heartbeat (every 8s)
- Match state polling (every 3s)
- Score synchronization

### 3.4 Automation Engine

**File:** `backend/automation_engine.py`

#### Trigger: Quiz Submission
1. **Risk Classification**: Classify student as At Risk / On Track
2. **Topic Analysis**: Identify weak areas from wrong answers
3. **Remedial Quiz**: Auto-generate targeted practice
4. **Learning Path**: Create AI-driven intervention plan
5. **Notifications**: Alert teachers/students

---

## Part 4: Integration Mapping

### 4.1 Current UI → Backend Function Mapping

| UI Component | Backend Function Needed | Status |
|--------------|------------------------|--------|
| QuizExperience (start quiz) | `fetchGeneratedQuiz()` | ✅ In current branch |
| QuizExperience (save results) | `saveQuizResults()` | ✅ In current branch |
| QuizBattle (matchmaking) | `joinQuizBattleQueue()` | ⚠️ Needs verification |
| QuizBattle (submit answer) | `submitQuizBattleAnswer()` | ⚠️ Needs verification |
| Lives/Hearts persistence | None (UI-only currently) | ❌ Not implemented |
| Hint cost tracking | Backend key/skip system | ❌ Not implemented |

### 4.2 Missing Backend Integration

After merge with main, verify:

1. **Adaptive Quiz** - Endpoint `/api/quiz/adaptive-select`
2. **Competency Analysis** - Endpoint `/api/quiz/student-competency`
3. **Risk-based Automation** - Quiz submissions trigger automation engine
4. **Quiz Battle Real-time** - Presence/heartbeat to Firestore

### 4.3 Conflict Points to Watch

| Area | Current Branch | Main Branch | Resolution |
|------|----------------|-------------|-------------|
| QuizExperience state | Has full state for modals/lives | May have older simpler version | Keep current |
| QuizBattle API | New service calls | May have different routes | Verify service mapping |
| Firestore schema | quizService uses specific structure | May have additions | Merge schemas |

---

## Part 5: Services Reference

### Quiz Service (`src/services/quizService.ts`)

```typescript
// Key functions to preserve after merge
saveGeneratedQuiz()      // Save AI-generated quiz
fetchGeneratedQuiz()     // Get quiz by ID
saveQuizResults()         // Save completion results
fetchQuizzesByTeacher()   // Teacher quiz list
fetchAdaptiveQuiz()       // Get adaptive quiz
```

### Quiz Battle Service (`src/services/quizBattleService.ts`)

```typescript
// Key functions to preserve after merge
joinQuizBattleQueue()      // Matchmaking
createQuizBattleBotMatch() // Bot battle
submitQuizBattleAnswer()   // Submit answer
getStudentBattleStats()    // Get player stats
getStudentBattleHistory()  // Past matches
getStudentBattleLeaderboard() // Rankings
```

---

## Appendix: Key Files to Preserve

### Frontend (Current Branch)
- `src/components/QuizExperience.tsx` - Main quiz UI
- `src/components/InteractiveLesson.tsx` - Lesson quiz
- `src/components/QuizBattlePage.tsx` - Battle mode
- `src/services/quizService.ts` - Quiz data operations
- `src/services/quizBattleService.ts` - Battle operations
- `src/types/models.ts` - Type definitions

### Backend (After Merge Verification)
- `backend/routes/quiz_generation_routes.py`
- `backend/routes/quiz_battle.py`
- `backend/automation_engine.py`
- `functions/src/triggers/quizBattleApi.ts`

---

**End of Reference Manifest**