# Binding merge contract — QA PRs 195/196/197 → main

Applies to all lanes in `2026-10-06-qa-merge-plan.md`, merge order **196 → 195 → 197**.
Never "last branch wins". Line numbers refer to pre-rebase snapshots:
main `8a361cd`, Ellijah **E** `fadf55d`, Jerrick **J** `cb54b4cb`, Marcus **M** `9a311bca`.
**ADAPT** = the stated change is required; the named variant is not approved unchanged.
Verification rule: keep independent regression coverage, but rewrite assertions that
encode a losing contract. Never keep contradictory expectations or tautological tests.

1. **Chat throttle — authenticated identity, 60 requests / 60 seconds.** WINNER **M**
   (`backend/main.py:352–355, 2427–2445, 2736–2741, 2936–2939`). One shared window for
   `/api/chat` + `/api/chat/stream`, keyed by `request.state.user.uid`; keep M's IP
   fallback and HTTP 429. DROP J's `_chat_message_windows` / body-`userId` limit and E's
   9/3s decorators + wrappers. Frontend: drop E's 5-msg/min cooldown and M's 10-msg/3s
   counter; keep in-flight send lock, surface server throttling.
2. **Classroom quiz cap — 12.** WINNER **E/M** (E `backend/main.py:11664–11665`,
   `QuizMaker.tsx:118`). Over-cap generation/preview → 400 `"capped at 12 items"`.
   DROP J's 10-cap and J/M's 30-question UI maximum. Do NOT touch main's Pydantic
   30-item structural ceiling (still 422 above it).
3. **Calendar schema — `classId?: string`.** WINNER **E** (`calendarService.ts:53–110`,
   `models.ts:567`). DROP J's `classSectionId`/`className`. Keep M's date validation
   and E's rollback tests.
4. **AI telemetry — nested Manila-day, percentage rates.** WINNER **E**
   (`ai_monitoring.py:42–116,250`, `inference_client.py:543–579`,
   `aiMonitoringService.ts:31–78`, `AIMonitoringPage.tsx:56,127–162`). 30 Manila-day
   buckets, ms latency, 0–100 percentages, null when denominator is zero. DROP J/M
   top-level UTC counters/rates and competing UI reads.
5. **Duplicate imports — whole-batch LRN rejection, explicit moves preserved.**
   WINNER **E's rejection contract** (`main.py:6244–6285`) + **M's all-occurrences
   detection** (`5343`, `6052`) + **J's fail-closed rechecks** (`6507–6592`). 200
   envelope `success:false`, zero writes, blocked-row details, consume preview token;
   DROP M's 409. Class-record imports: dupe LRNs → 400, validate ALL files before
   first write (E's persistence at 8303 precedes rejection at 8410 — fix placement).
   DROP E's blanket existing-users LRN rejection for class-record updates (8264–8277).
6. **Student `managedStudents` risk writes — DROP.** WINNER **main**
   (`progressService.ts:631–657`, `firestore.rules:337–345`). Remove M
   `progressService.ts:679–689`, remove `scoreRiskStatus`, restore `if (!isAtRisk)`.
   KEEP E's latest-attempt average (`33–46,608`). Never broaden rules for this.
7. **Assigned-quiz ownership — UID only.** WINNER **main/J** (`quizService.ts:214–238`,
   rules 501–515). Remove E's recipient helper + `where('lrn','in',...)`
   (`quizService.ts:215–242`); single `studentUid` param; ModulesPage passes
   `userProfile.uid`; drop M's LRN-only call. Replace, don't trust, E's mocked
   legacy-loader test (`quizService.test.ts:121–165`).
8. **Gate files — KEEP main's committed versions.** Drop all three `GATES.md`
   deletions and M's `GATES-*.md` deletions. Use committed main blob, not any
   working-copy file.
9. **Tutor instructions — main English-only + M first-response guidance.**
   WINNER **main** (`main.py:2439,2498–2501,13662`) + **M** (`2455–2456`: first
   response asks a guiding question, no final numeric answer). DROP E's prompt
   rewrite and J's duplicate safety-rule injection; remove any mix-in-Tagalog /
   match-student-language instructions. Keep JEV direct-answer refusal.
10. **Case winners:** quiz completeness — E repair/retry (`11846–11894`) + J
    validation call (`11880–11885`) + M requested-count preview (`11922–11927`);
    exact requested count or 502; one topic-normalization (J's). Quiz-maker —
    J defaults (`QuizMaker.tsx:120–131,218–220,411–423,818`: default 5, max 12
    topics, one 120-char title) + M persisted `sourceRequest.title`. Answer
    feedback — M (`QuizExperience.tsx:590–703,1306–1310`); keep J's review panel;
    one canvas guard (M's). Retakes — main gate (`quizService.ts:318–330`,
    rules 504–517) for EVERY assignment incl. legacy; drop E's graded-only
    bypass; keep E's submission `assignmentId`. Lesson resume — M zero-based
    helper + E progress writer only (`LessonViewer.tsx:1503–1513`); drop parent
    persistence + duplicate restoration. Completion/XP — M practice gate
    (`1623–1626`) + E counts/XP guards; drop E's unconditional
    `isPracticeRequired=false`; keep J's Review badge. Quiz loading/back —
    J (`ModuleDetailView.tsx:176–239,480–496,57–71`, `ModulesPage.tsx:232–241`);
    drop M's retry state + `LessonViewer.tsx:1307–1312` listener. Admin
    analytics — J schema/cohorts (`adminService.ts:1116–1134,1182–1207`,
    `AdminAnalytics.tsx:200–231,241–267`) + M synthetic-trajectory removal;
    real aggregates or empty states only. Teacher analytics — E
    (`TeacherDashboard.tsx:408–432,3729–3804,3811–3937`) + J cancel-guard +
    formatter; drop J/M topic estimates. Topic mastery — E normalization +
    M class selector (normalize to canonical IDs BEFORE M's filter). Admin
    users — J (`adminUserValidation.ts:89`, `user_provisioning_service.py:176–209`,
    `AdminUserManagement.tsx:455–475`); drop E's UI bypass + M's dup validation.
    Subjects — M (`AdminSubjects.tsx:86–96,129–155,190–208`); one merged
    availability source. Home streak — E (`App.tsx:163–174,1390–1401,1522`) +
    main `App.tsx:833` profile refresh; drop M's `progress.dailyStreak`. PDF
    ingestion — E backend validator (`quiz_battle.py:68–80`) + M frontend helper
    (add `quiz_pdfs/` prefix check); drop J's regex, keep J's error message.
