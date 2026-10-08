### Summary
When a teacher assigns a quiz to a student via Quiz Maker / Quiz Bank, the student navigates to the assigned quiz URL (e.g. `/modules?section=assigned-quizzes&quizId=<quizId>`), but the quiz fails to load with an error message:
> **"Could not load assigned quizzes. [Retry]"**

Additionally, there is a UX disconnect: the student expects the assigned quiz to appear under the **"Recommended"** tab/filter, but selecting "Recommended" in Practice Center displays **"No topics found"** because it only filters static topics by diagnostic `atRiskTopics`, completely ignoring teacher-assigned quizzes.

---

### Observed Behavior (from User Report & Screenshots)

1. **Screenshot 1 (`ModulesPage` - Practice Tab)**:
   - Under the "Assigned by your teacher" section, the component displays an error in red: `Could not load assigned quizzes.` along with a `Retry` button.
2. **Screenshot 2 & 3 (Practice Center - Recommended Filter)**:
   - URL: `https://mathpulse-ai-2026.web.app/modules?section=assigned-quizzes&quizId=MVFhLOy7HkZPuGuuaiGb`
   - When the student clicks the "Recommended" filter pill under Practice Center, the view displays:
     > **"No topics found"**
     > *Try adjusting your filters or search query*
   - The assigned quiz is nowhere to be found in the Recommended section.

---

### Steps to Reproduce

1. Sign in as a Teacher.
2. Create or select a quiz in Quiz Maker / Quiz Bank.
3. Open the "Assign" modal and select a registered student.
4. Confirm assignment (creates a `quizAssignments` record and updates `generatedQuizzes` with `recipientUids`).
5. Sign in as the assigned student.
6. Click the assignment notification or navigate directly to `/modules?section=assigned-quizzes&quizId=<quizId>`.
7. Observe that under "Assigned by your teacher", the loading fails with `"Could not load assigned quizzes."`
8. In the Practice Center below, click the **"Recommended"** filter pill. Observe that it shows `"No topics found"`.

---

### Technical Investigation & Root Cause Analysis

#### 1. Assigned Quiz Loading Failure (`fetchPendingQuizzesForStudent`)
- Located in `src/components/ModulesPage.tsx` lines 277-290 and `src/services/quizService.ts` lines 215-246:
  ```typescript
  export async function fetchPendingQuizzesForStudent(studentUid: string): Promise<PlayableQuiz[]> {
    if (!studentUid) return [];
    let assignmentsSnap;
    try {
      const assignmentsQuery = query(
        collection(db, 'quizAssignments'),
        where('lrn', '==', studentUid),
        where('status', '==', 'pending'),
        orderBy('assignedAt', 'desc'),
      );
      assignmentsSnap = await getDocs(assignmentsQuery);
    } catch (err) {
      if (!isMissingIndexError(err)) throw err;
      ...
    }

    const quizzes: PlayableQuiz[] = [];
    for (const assignDoc of assignmentsSnap.docs) {
      const { quizId } = assignDoc.data();
      const gen = await fetchGeneratedQuiz(quizId);
      if (gen) quizzes.push(toPlayableQuiz(gen, assignDoc.id));
    }
    return quizzes;
  }
  ```
- **Potential Failure Points**:
  - **Uncaught `fetchGeneratedQuiz` errors**: If any individual `fetchGeneratedQuiz(quizId)` fails (due to security rule denial, missing document, or network error), the entire loop throws without per-item recovery.
  - **Firestore Security Rules**: In `firestore.rules`:
    ```rules
    match /generatedQuizzes/{docId} {
      allow read: if isTeacherOrAdmin()
        || (isSignedIn() && resource.data.recipientUids is list
          && request.auth.uid in resource.data.recipientUids)
        || (isTeacher() && ownerByField('teacherId'));
    }
    ```
    If `recipientUids` array union failed during quiz assignment, or if the quiz document does not contain the student's `request.auth.uid`, `getDoc(doc(db, 'generatedQuizzes', quizId))` throws a `permission-denied` error.
  - **Index or Query Error Handling**: If Firestore returns an index error whose message doesn't match the exact string check in `isMissingIndexError(err)`, it throws rather than falling back to the unindexed query.

#### 2. Disconnect with "Recommended" Tab & Filter
- In `src/components/PracticeCenter.tsx` lines 129-134:
  ```typescript
  } else if (selectedFilter === 'recommended') {
    statusMatch = atRiskTopics.some(rt => 
      topic.name.toLowerCase().includes(rt.toLowerCase()) || 
      rt.toLowerCase().includes(topic.name.toLowerCase())
    );
  }
  ```
  - The "Recommended" pill in Practice Center strictly filters static curriculum topic cards against the student's diagnostic `atRiskTopics`.
  - It does not include teacher-assigned quizzes.
  - If the student has not completed a diagnostic assessment or has no at-risk topics, `atRiskTopics` is empty, leading to the "No topics found" empty state.
- In `ModulesPage.tsx`:
  - `activeTab === 'recommended'` is for RAG curriculum learning paths.
  - The notification link uses `section=assigned-quizzes`, which switches to `activeTab === 'practice'`.
  - Students naturally look for "Recommended" or assigned work when directed to practice.

---

### Suggested Fixes & Implementation Tasks

- [ ] **Resilient Quiz Fetching in `quizService.ts`**: Wrap individual `fetchGeneratedQuiz(quizId)` calls in `try/catch` with `Promise.allSettled` so one unreadable or missing quiz does not break the entire pending quizzes list.
- [ ] **Firestore Permissions & Ingestion Verification**: Ensure `assignQuizToStudent` reliably adds `recipientUids` and that `quizAssignments` queries comply with security rules.
- [ ] **Surface Assigned Quizzes in Recommended View**:
  - In `ModulesPage`, display pending assigned quizzes prominently in both the Practice tab and/or the Recommended tab banner so students cannot miss them.
  - In `PracticeCenter.tsx`, if the "Recommended" filter is active, either include assigned quizzes or provide a clear CTA/message pointing to "Assigned by your teacher" above.
- [ ] **Friendly Empty State for Practice Center Recommended**: Show a helpful tip explaining that recommended practice topics are based on assessment results (e.g., "Complete your diagnostic assessment to get personalized topic recommendations").
