### Summary
When an intervention learning path is assigned to a student by a teacher, Steps 2, 3, and 4 inside the interactive module guide (`ModuleStepGuide`) have no interactive or educational content. The student only sees a 1-line **"Step Overview"** card (e.g., *"Demonstrate understanding (assessment · 10 mins · 5 items)"*) followed by empty white space.

---

### Observed Behavior (from User Screenshot)

- **Breadcrumb / Title**: `Intervention: Foundational Skills ... > Step 4 - Step 4: Foundational Skills - Mastery Check`
- **Step Type**: `Step 4 · Assessment`, `MEDIUM`, `10m`
- **Rendered Content**:
  - A single card:
    > **STEP OVERVIEW**
    > `Demonstrate understanding (assessment · 10 mins · 5 items)`
  - Underneath the Step Overview card: Completely blank space.
  - No assessment questions, no interactive quiz, no answer choices, and no submission controls.
  - Bottom action bar displays: `Step 4 of 4 - 100% Complete` with a `Finish Module` button that completes the module without the student ever practicing or demonstrating mastery.
- Similarly, **Step 2** (*Guided Practice · 12 mins · 10 items*) and **Step 3** (*Independent Practice · 15 mins · 10 items*) render only their 1-sentence metadata summary with no practice exercises.

---

### Steps to Reproduce

1. As a Teacher, open an at-risk student in the **Teacher Dashboard** > **Intervention View**.
2. Navigate to the **Generated Learning Path** tab.
3. Click **"Assign to Student"** (`assignLearningPathAsModule`).
4. Sign in as the assigned student and open the module under the **Teacher Uploaded** tab.
5. Launch the module and proceed through the steps:
   - **Step 1 (Video Lesson)**: Loads the video player correctly.
   - **Step 2 (Guided Practice)**: Shows only `Step Overview: Work through examples (practice · 12 mins · 10 items)` and empty whitespace.
   - **Step 3 (Independent Practice)**: Shows only `Step Overview: Solve problems independently (practice · 15 mins · 10 items)` and empty whitespace.
   - **Step 4 (Mastery Check Assessment)**: Shows only `Step Overview: Demonstrate understanding (assessment · 10 mins · 5 items)` and empty whitespace.

---

### Root Cause Analysis

#### 1. In `src/services/interventionService.ts` (`assignLearningPathAsModule`)
```typescript
export async function assignLearningPathAsModule(
  plan: InterventionPlan,
  teacherId: string,
): Promise<string> {
  const steps = plan.learning_path?.steps || [];
  const sections = steps.map((s) => ({
    title: `Step ${s.step_number}: ${s.title}`,
    content: `${s.description || s.topic} (${s.type.replace('_', ' ')} · ${s.duration_minutes} mins${s.num_items ? ` · ${s.num_items} items` : ''})`,
    stepType: s.type,
    stepNumber: s.step_number,
    topic: s.topic,
    durationMinutes: s.duration_minutes,
    numItems: s.num_items || null,
    difficulty: s.difficulty,
    competencyTag: s.competency_tag || '',
    youtubeQuery: s.youtube_query || '',
    isCompleted: s.is_completed || false,
  }));

  const docRef = await addDoc(collection(db, 'modules'), {
    title: `Intervention: ${plan.weakest_topic} — ${plan.student_name}`,
    ...
    sections,
    practice: [], // <--- EMPTY! No practice questions generated or attached
    ...
  });
```
- Each section's `content` is set to just a short summary string describing the duration and items count.
- The `practice` array is left empty (`practice: []`).

#### 2. In `src/components/ModuleStepGuide.tsx`
- The component expects either:
  1. `detectedType === 'video_lesson'`: renders `<InterventionVideoStep />` (works for Step 1).
  2. `hasPractice` where `const hasPractice = practice && practice.length > 0`: renders the interactive question cards and practice tab.
- Because `practice: []` is empty and `section.content` only contains the one-line overview:
  - Step 2 (`practice`), Step 3 (`practice`), and Step 4 (`assessment`) fail both checks.
  - The UI falls back to only rendering the `<div className="bg-white ..."> <HelpCircle /> Step Overview ... </div>` card, leaving the rest of the page empty.
  - There is no generator or embedded quiz for `assessment` or `practice` step types.

---

### Suggested Fixes & Implementation Tasks

- [ ] **Generate or Link Practice/Assessment Questions**:
  - When assigning an intervention learning path in `interventionService.ts`, generate or pre-populate practice/quiz questions for the practice and assessment steps (e.g., via backend AI question generation or linking with the question bank / generated quizzes).
- [ ] **Interactive Assessment/Practice Rendering in `ModuleStepGuide.tsx`**:
  - If a step is of type `practice` or `assessment` and items are missing or dynamic, provide an on-demand "Generate Practice Questions" or "Launch Assessment Quiz" CTA that generates questions dynamically via `generatePracticeSession` / `QuizExperience`.
  - Alternatively, embed interactive practice questions scoped per step (`section.practiceItems` or per-step quiz payload).
- [ ] **Enrich Step Content**:
  - Provide meaningful written instructional content, worked examples, and explanations in `section.content` instead of only a brief metadata string.
