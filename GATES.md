# Gates: teacher unassigned-student labelling + question_bank lock-down

Scope: (1) A teacher with no students of their own gets the all-students fallback list (kept, so they can find and assign students), but those students were counted as "30 Enrolled Students / 30 active". Only students in the teacher's classes now count; the rest are labelled "Unassigned students". Live counts for teacher@mathpulse.ai: 0 classrooms, 0 managedStudents, 0 advisees, 30 student accounts system-wide. (2) `question_bank` (questions with answers) was readable by any signed-in user; only the teacher Question Bank panel reads it client-side.

- [x] G1: Fallback students are excluded from enrolled counts and labelled unassigned; real rosters unchanged
  CHECK: npx vitest run src/components/__tests__/TeacherDashboardClassCounts.test.ts 2>&1
  EXPECT: /Tests\s+\d+ passed/
  EVIDENCE: 4 new tests (pool with no classes -> 0 enrolled / 2 unassigned; pool students already in a class stay enrolled; real roster unchanged; notice renders badge, count, helper text); related files 15 passed

- [x] G2: Full frontend suite, typecheck and anti-slop lint pass
  CHECK: npx tsc --noEmit 2>&1 && echo TSC_CLEAN
  EXPECT: TSC_CLEAN
  EVIDENCE: TSC_CLEAN; vitest Test Files 156 passed (156), Tests 999 passed (999); oxlint --quiet clean; eslint clean on changed files

- [x] G3: Assign flow still reaches unassigned students
  EVIDENCE: AddStudentsModal fetches its own candidates (props: grade, section, existingStudentUids); CreateClassModal takes no student list; the fallback query in fetchData is unchanged

- [x] G4: question_bank reads limited to teachers/admins; writes stay server-only
  CHECK: cd functions && npm run build && npm test 2>&1
  EXPECT: /# fail 0/
  EVIDENCE: # pass 82, # fail 0 (new rules test failed with `allow read: if isSignedIn();`); question_bank currently holds 0 docs; only client reader is QuestionBankPanel.tsx:75 (teacher view)

Post-deploy check: deploy firestore rules after merge; teacher dashboard shows 0 enrolled and the Unassigned students notice.
