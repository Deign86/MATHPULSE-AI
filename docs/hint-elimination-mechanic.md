# Hint Elimination Mechanic - Implementation Guide

## Overview
This document describes the hint system implementation across both Module Quiz (InteractiveLesson.tsx) and Practice Center (QuizExperience.tsx).

## How It Works

### Backend API
The backend should provide:
- `hint_cost`: Number of keys required to use a hint (e.g., 1 key)
- On hint use, backend returns the index of a wrong answer to eliminate

### Frontend Implementation

#### State Management
```typescript
const [eliminatedByHint, setEliminatedByHint] = useState<Record<number, number[]>>({});
```

Each key is the question index, value is array of eliminated wrong option indices.

#### Using Hint
```typescript
const handleHintUse = async () => {
  const currentQuestion = questions[currentQuestionIndex];
  const eliminated = eliminatedByHint[currentQuestionIndex] || [];
  
  // Call backend to get answer to eliminate
  const response = await fetch('/api/hint', { 
    method: 'POST',
    body: JSON.stringify({ questionId: currentQuestion.id })
  });
  const { eliminatedIndex } = await response.json();
  
  // Update local state
  setEliminatedByHint(prev => ({
    ...prev,
    [currentQuestionIndex]: [...eliminated, eliminatedIndex]
  }));
  
  // Deduct keys locally (optimistic update)
  setKeysCount(prev => prev - 1);
};
```

#### Displaying Eliminated Options
```typescript
{currentQuestion.options?.map((option, idx) => {
  const isEliminated = eliminatedByHint[currentQuestionIndex]?.includes(idx);
  
  return (
    <button 
      key={idx}
      disabled={isEliminated}
      className={isEliminated ? 'opacity-30 line-through' : ''}
    >
      {option.text}
    </button>
  );
})}
```

#### Disabling Hint Button
Hint button should be disabled when:
1. User has no keys remaining
2. Explanation is currently shown
3. All wrong options have been eliminated

```typescript
const eliminatedCount = (eliminatedByHint[currentQuestionIndex] || []).length;
const wrongChoicesCount = (currentQuestion.options?.length || 0) - 1;
const allWrongEliminated = wrongChoicesCount > 0 && eliminatedCount >= wrongChoicesCount;
const canUseHint = keysCount > 0 && !showExplanation && !allWrongEliminated;
```

## Next Question Button Behavior

When all wrong answers are eliminated via hint:
- Show "Next Question" button in footer (same as when answer is wrong)
- This allows user to proceed to next question
- User doesn't get "correct" state since they used hint to eliminate

## Files Modified
- `src/components/InteractiveLesson.tsx` - Module quiz hint
- `src/components/QuizExperience.tsx` - Practice center hint