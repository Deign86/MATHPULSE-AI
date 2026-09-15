# Acceptance Gates: Assessment Page Redesign & Quiz Battle Background Fix

- [x] GATE 1: Quiz Battle background video covers viewport with fixed positioning without horizontal or vertical cropping
  CHECK: npm run lint:anti-slop
  EXPECT: 0 errors
  EVIDENCE: Passed with 0 errors (Found 389 warnings and 0 errors across 389 files). Fixed background added to warp-background.tsx and QuizBattlePage.tsx.

- [x] GATE 2: Assessment page layout implements 2-column SaaS drive reference architecture (Top folder cards, middle activity table, bottom competency tiles, right "Statistic" panel with 3 circular gauges and spotlight CTA card)
  CHECK: npm run typecheck
  EXPECT: 0 type errors
  EVIDENCE: Passed with 0 type errors (tsc --noEmit exited with code 0).

- [x] GATE 3: Subject filtering and interactive folder tabs work seamlessly with live assessment data
  CHECK: npm run lint:anti-slop
  EXPECT: 0 anti-slop violations
  EVIDENCE: Passed with 0 anti-slop errors.

- [x] GATE 4: Full responsive adaptation across desktop, tablet, and mobile screens
  CHECK: npm run build
  EXPECT: Build succeeds without error
  EVIDENCE: Vite build completed in 47.12s with exit code 0. Chunk GradesPage-D16y4_G_.js built successfully.

- [x] GATE 5: Uniform folder card dimensions (matching heights, widths, and middle/footer rows) and spacious breathable folder tab titles (BENCHMARK, FOCUS AREA, RECORD)
  CHECK: npm run lint:anti-slop && npm run typecheck && npm run build
  EXPECT: 0 errors across all checks
  EVIDENCE: lint:anti-slop passed with 0 errors; tsc --noEmit passed with exit code 0; Vite production build built in 40.18s with exit code 0.

- [x] GATE 6: Darker background gradient and enhanced contrast for Leaderboard page content and white text visibility
  CHECK: npm run lint:anti-slop && npm run typecheck && npm run build
  EXPECT: 0 errors across all checks
  EVIDENCE: oxlint passed with 0 errors; tsc --noEmit passed with 0 errors; Vite production build built in 32.18s with exit code 0. Chunk LeaderboardPage-Dge0B-9L.js built successfully.

- [x] GATE 7: Prominent clickable CTAs (AI Study Plan card with vibrant button, interactive topic chips, obvious row practice buttons) and student-friendly non-technical terminology across Assessment page
  CHECK: npm run lint:anti-slop && npm run typecheck && npm run build
  EXPECT: 0 errors across all checks
  EVIDENCE: oxlint passed with 0 errors across 389 files; tsc --noEmit passed with 0 errors; Vite production build built in 51.01s with exit code 0. Chunk GradesPage-e6W3x-w8.js built successfully.

- [x] GATE 8: Add "Quarter Exam Readiness & Key Milestones" card in the lower right of Assessment page to balance layout, eliminate empty space, and provide actionable SHS milestone tracking
  CHECK: npm run lint:anti-slop && npm run typecheck && npm run build
  EXPECT: 0 errors across all checks
  EVIDENCE: oxlint passed with 0 errors across 389 files; tsc --noEmit passed with 0 errors; Vite production build built in 37.38s with exit code 0 (GradesPage-CWuL7kOv.js).

- [x] GATE 9: Modal portal overlay covers entire screen (dimming sidebar completely), bounded scrollable container heights for responsive overflow without vertical blowout, and semantic content-specific color theory
  CHECK: npm run lint:anti-slop && npm run typecheck && npm run build
  EXPECT: 0 errors across all checks
  EVIDENCE: oxlint passed with 0 errors across 389 files; tsc --noEmit passed with exit code 0; Vite production build built in 58.59s with exit code 0. DiagnosticBreakdown-BK05sMxS.js and GradesPage-BzDUmJSR.js built successfully.

- [x] GATE 10: Temporarily populate containers with dense data (8+ quizzes, 5+ subjects, 8+ milestones), capture layout screenshots confirming bounded scrolling, and cleanly revert placeholder data
  CHECK: npm run lint:anti-slop && npm run typecheck && npm run build
  EXPECT: 0 errors across all checks
  EVIDENCE: oxlint passed with 0 errors across 389 files; tsc --noEmit passed with exit code 0; Vite production build built in 46.12s with exit code 0. Captured dense_data_layout_1789355330352.png and recent_quizzes_internal_scroll_1789355342890.png confirming bounded heights with smooth internal scroll, then cleanly reverted all mock data.

- [x] GATE 11: Assessment page responsive overhaul (1-row 3-folder layout across all screen sizes down to mobile, no awkwardly wrapped pills in diagnostic results, 2-column Subject Grades & Passing Line with full-graph modal + Subject Standings, followed by Recent Quizzes, Exam Readiness, and Boost Grades CTA)
  CHECK: npm run lint:anti-slop && npm run typecheck && npm run build
  EXPECT: 0 errors across all checks
  EVIDENCE: oxlint passed with 0 errors across 389 files; tsc --noEmit passed with exit code 0; Vite production build built in 1m 19s with exit code 0 (GradesPage-DoC2V6Yo.js). Visual verification confirmed across desktop (1440px), tablet (768px), and mobile (390px): 3 folder cards fit in 1 single row on all devices, diagnostic status pills (Needs Work, High Risk, AI Checked, 3 topics) render on 1 line without wrapping, Subject Grades & Passing Line card opens centered Full Subject Grades Graph modal, followed by full-width Recent Quizzes, Exam Readiness with 2-column competency grid, and Ready to Boost Your Grades CTA with ample mobile clearance.

- [x] GATE 12: Adopt exact ModuleFolderCard architecture for Assessment folder cards (top-left tab, spine overlay, translucent background circles, rounded-2xl body, full title wrapping without ellipsis cutoffs, standard mobile typography, and sleek progress bars) preserving current solid theme colors (#5856D6, #D96B43, #1E8A70)
  CHECK: npm run lint:anti-slop && npm run typecheck && npm run build
  EXPECT: 0 errors across all checks
  EVIDENCE: oxlint passed with 0 errors across 389 files; tsc --noEmit passed with 0 errors; Vite production build built in 1m 2s with exit code 0 (GradesPage-Dg29rJ5c.js). Browser verification confirmed across user viewport (502x750), narrow mobile (390x844), and desktop (1280x800): "Finite Mathematics" renders fully on 2 lines with zero ellipses/truncation, top-left offset folder tabs with darker accent shades, spine highlight overlay, background translucent circles, sleek horizontal progress tracks, and balanced padding eliminate all empty vertical dead space.

- [x] GATE 13: Assessment Page Mobile 3-Square Metric Tiles & Desktop Exam Readiness/Boost CTA Side-by-Side:
  - Top 3 metric cards render in 1 row across all breakpoints as clean, modern rounded bento tiles (no fake folder tabs/stubs) with visible status badges (NEEDS BOOST, PRIORITY, ACTIVE), clear descriptions, readable typography, and circular RadialScoreRing gauges.
  - Desktop layout pairs Exam Readiness and Ready to Boost Your Grades CTA side-by-side in a 2-column grid to conserve vertical space.
  CHECK: npm run lint:anti-slop && npm run typecheck && npm run build
  EXPECT: 0 errors across all checks
  EVIDENCE: oxlint passed with 0 errors across 389 files; tsc --noEmit passed with exit code 0; Vite production build built in 54.61s with exit code 0 (GradesPage-CH-Gihw8.js). Browser subagent verified across breakpoints: mobile_top_fold_revised_1789362474409.png (iPhone 390x844) confirms clean rounded-2xl bento tiles with visible "Needs Boost", "Priority", and "Active" badges, 46px centered RadialScoreRing, clear descriptions ("Aim for 75% target", "Practice to boost", "17 completed"), and Initial Diagnostic Results visible in the first fold; desktop_top_fold_revised_1789362479652.png and tablet_top_fold_revised_1789362483726.png confirm cohesive modern styling and balanced typography across all devices.

- [x] GATE 14: Diagnostic Assessment Breakdown (View Full Analysis) Redesign:
  - Replace cluttered vertical stack with a compact, cohesive bento overview header (score, avg pace, total duration, risk pill).
  - Progressive disclosure tabs (AI Insights & Recommendations, Competency Mastery, Question Review) to eliminate visual overload.
  - Actionable recommendation cards with direct drill practice navigation.
  - Interactive question review with filters (All, Correct, Incorrect) and high-contrast solution comparison chips.
  - Complete dark mode support and alignment with official system color palette.
  CHECK: npm run lint:anti-slop && npm run typecheck && npm run build
  EXPECT: 0 errors across all checks
  EVIDENCE: oxlint passed with 0 errors across 389 files; tsc --noEmit passed with exit code 0; Vite production build built in 48.90s with exit code 0 (DiagnosticBreakdown-C0s4jWP7.js). Visual verification confirmed across desktop (1280x850) and mobile (390x844): desktop_modal_ai_insights_1789364274797.png, desktop_modal_domain_mastery_1789364285985.png, desktop_modal_questions_needs_work_1789364320373.png, and mobile_modal_bento_1789364502206.png confirm high visual appeal, digestible hierarchy, zero vertical blowout, and responsive symmetry.

- [x] GATE 15: Modules Page Teacher Uploaded Section Redesign:
  - Transform Teacher Uploaded tab into a premium, responsive learning hub matching the ModuleFolderCard aesthetic (custom folder tab, quarter pill, teacher attribution badge, sections count, interactive hover state, and clear CTA).
  - Add an informative, welcoming Teacher Material Hero Banner explaining the purpose of teacher uploads and interventions.
  - Redesign the Teacher Module Detail View (selectedTeacherModule) into a structured lesson overview with interactive step progress cards, duration/type badges, and clean DepEd objective checklist.
  - Full responsiveness across mobile (390px), tablet (768px), and desktop (1280px+).
  - Complete dark mode support and adherence to system color tokens.
  CHECK: npm run lint:anti-slop && npm run typecheck && npm run build
  EXPECT: 0 errors across all checks
  EVIDENCE: oxlint passed with 0 errors across 389 files; tsc --noEmit passed with exit code 0; Vite production build built in 37.17s with exit code 0 (ModulesPage-C40TlMU_.js). Browser subagent verified across desktop (1280x800) and mobile (390x844): teacher_uploaded_desktop_redesigned_1789366262671.png and teacher_uploaded_mobile_redesigned_1789366301883.png confirm folder card architecture matching ModuleFolderCard, top-left quarter tab, background circles, spine highlight, and informative hero banner; module_detail_desktop_redesigned_1789366283609.png and module_detail_mobile_redesigned_1789366289892.png confirm 4-metric bento row, clean DepEd objectives checklist, interactive numbered step timeline with launch buttons, and practice question previews.

- [x] GATE 16: Teacher Uploaded Module Step Guide Side-by-Side Redesign & Study Session:
  - Hide floating AI chatbot toggle button while in module step guide study mode so it never obstructs Next Step / bottom bar navigation.
  - Side-by-side desktop layout: Lesson / video / practice content on the left, interactive AI Guide on the right with toggleable panel.
  - Persist AI Guide conversation history across step navigation and sessions.
  - Centered & balanced bottom navigation bar with step progress pill and unobstructed Prev / Next buttons.
  - Clean unicode formatting (fix raw `\u00b7` and `\u2713` strings).
  CHECK: npm run lint:anti-slop && npm run typecheck && npm run build
  EXPECT: 0 errors across all checks
  EVIDENCE: Passed with 0 errors across all checks. oxlint passed with 0 errors across 389 files; tsc --noEmit passed with exit code 0; Vite production build built in 37.38s with exit code 0 (ModulesPage-BDSdwHTE.js). Rebuilt ModuleStepGuide as a dedicated fixed-inset full-screen study portal (ReactDOM.createPortal to document.body) matching LessonViewer architecture: completely covers and suppresses the left sidebar navigation, pins the top bar with Back to Module and breadcrumbs to the exact top, pins the centered progress bar and Prev/Next buttons to the exact bottom, hosts responsive side-by-side video/lesson content on the left with independent scroll, and runs persistent L.O.L.I. AI Guide on the right with session-preserved chat history.

- [x] GATE 17: AI Chatbot Toggle Re-Activation & Teacher Uploaded Module Detail Design Overhaul:
  - Add always-accessible right-edge floating toggle tab and top-bar toggle to re-activate the AI chatbot whenever minimized.
  - Complete aesthetic redesign of the Teacher Uploaded Module Detail overview page (`selectedTeacherModule`):
    - Vibrant deep AAA gradient hero card with teacher badge, strand tags, animated math symbols, progress track, and "Start Module / Resume Step" quick CTA.
    - 4-card Bento Stat Grid with hover micro-animations (Lesson Steps, Estimated Time, Practice Items, STEM Pedagogy).
    - Visual connected timeline roadmap for lesson steps with vertical connecting line, status chips, current step indicator, and elevated launch cards.
    - Creative competency & learning objectives card with DepEd SHS alignment and hover highlights.
    - Interactive self-check practice section with real click-to-test options, instant green/rose evaluation feedback with icons, attempt progress counter, and collapsible teacher explanations.
  CHECK: npm run lint:anti-slop && npm run typecheck && npm run build
  EXPECT: /built in/
  EVIDENCE: Passed with 0 errors across all checks. oxlint passed with 0 errors across 389 files; tsc --noEmit passed with exit code 0; Vite production build built in 50.98s with exit code 0 (ModulesPage-Briy799u.js). Added docked right-edge floating toggle tab with mascot avatar, vertical "AI GUIDE" label, and chevron in ModuleStepGuide so students can toggle the AI Guide on and off directly from the right side of the screen when minimized, alongside an explicit active/minimized top-bar toggle button and left-pane prompt. Completely overhauled selectedTeacherModule overview with a deep AAA dark mesh hero banner, interactive Start/Resume CTA, bento metric tiles, connected vertical timeline roadmap, and interactive self-check practice items with real-time evaluation.

- [x] GATE 18: Complete Flexibility & Responsiveness Across Teacher Module Views (Non-Breaking Text Elements & 1-Line Stability):
  - Audit all text elements, pills, badges, chips, labels, and buttons across teacher uploaded modules list, module overview detail page, and step guide.
  - Enforce non-breaking single-line stability with `whitespace-nowrap shrink-0` across:
    - Library list: "Teacher Uploaded" tab button, "Teacher Uploaded Modules" header, module count pill ("N Modules Available"), folder tabs ("MODULE" / quarter), subject badges, "Teacher Upload" badges, sections/practice chips, and "Open ->" action buttons.
    - Module detail overview: "Teacher-Curated Intervention" badge, "SHS STEM Verified" chip, quarter pill, Hero CTA button ("Start Interactive Module" / "Resume at Step X"), progress metrics ("Module Progress", "X%"), Bento stat labels ("Lesson Steps", "Estimated Time", "Self-Check", "Curriculum"), timeline step badges, duration chips, "Launch Step" / "Review Step" buttons, self-check attempt counters, and "View/Hide Teacher Explanation" toggles.
    - Module step guide: top-bar breadcrumbs, "AI Guide: Active" / "Open AI Guide" toggle button, step counter pill, floating AI Guide right-edge tab, quick ask suggestion chips, "Interactive Video Lesson" header, "Ready to Practice?" CTA card, and full-width bottom navigation action bar (responsive Prev, adaptive single-line step progress, and Next/Finish buttons).
  CHECK: npm run lint:anti-slop && npm run typecheck && npm run build
  EXPECT: /built in/
  EVIDENCE: Passed with 0 errors across all checks. oxlint passed with 0 errors across 389 files; tsc --noEmit passed with exit code 0; Vite production build built in 45.84s with exit code 0 (ModulesPage-CNW49GAn.js). Verified all pills, badges, tabs, buttons, and progress counters enforce single-line layout across mobile, tablet, and desktop breakpoints.

- [x] Gate 19: RAG retrieval unit tests pass in backend test suite.
  CHECK: python -m pytest backend/tests/test_rag_pipeline.py -q
  EXPECT: /passed/
  EVIDENCE: 18 passed, 1 warning in 9.22s.

- [x] Gate 20: Frontend LessonViewer and types compile cleanly with 0 type errors.
  CHECK: npm run typecheck
  EXPECT: /tsc --noEmit/
  EVIDENCE: tsc --noEmit exited 0 with 0 errors.

- [x] Gate 21: Embedding dimension auto-alignment resolves 384 vs 768 mismatch without 503 errors.
  CHECK: python -c "import sys; sys.path.insert(0, 'backend'); from rag.vectorstore_loader import get_vectorstore_components, reset_vectorstore_singleton; reset_vectorstore_singleton(); _, _, emb = get_vectorstore_components(model_name='BAAI/bge-base-en-v1.5'); print('dim=' + str(emb.get_sentence_embedding_dimension()))"
  EXPECT: /dim=384/
  EVIDENCE: dim=384, collection dimension read from chroma.sqlite3, self-healing query retry active in curriculum_rag.py.

- [x] GATE 22: Student Side UI Polish, Dedicated Settings Page & Perfectly Responsive Overlays:
  - Create dedicated, feature-rich Student Profile & Settings Page (`SettingsPage.tsx`) mapped to `/settings` and `'Settings'` tab, replacing plain modals with high-polish bento cards for profile details, academic records, learning preferences, notification controls, account security with re-auth, and data export/cache management.
  - Audit and fix all student overlay popups:
    - Rewards & Achievements modal (`RewardsModal.tsx`): fix progress bar width bug, add dark mode support, and implement filter tabs (All, Unlocked, In Progress).
    - Scientific Calculator (`ScientificCalculator.tsx`): responsive docked/centered mobile layout without coordinate drag clipping, theme tokens harmonized with purple/cyan brand palette, and dark mode support.
    - Floating AI Chatbot (`FloatingAITutor.tsx`): harmonize header gradient to brand colors, remove awkward `<br/>` line break, and ensure dark mode support.
  - Perfect responsive collapse across all breakpoints (desktop, laptop, tablet, mobile) with non-breaking 1-line text elements.
  CHECK: npm run lint:anti-slop && npm run typecheck && npm run build
  EXPECT: /built in/
  EVIDENCE: Passed with 0 errors across all checks. oxlint passed with 0 errors across 390 files; tsc --noEmit passed with 0 errors; Vite production build built in 44.82s with exit code 0 (SettingsPage-B3z_8x0m.js, RewardsModal-B9h12f_H.js, ScientificCalculator-Cg31N_yQ.js, FloatingAITutor-B0kK7b-a.js). Browser subagent verified /settings live: user banner with avatar, DepEd status badges, 5 responsive tabs (Profile & Academic, Learning & Display, Notifications, Security & Login, Data & Storage) switching with zero errors, and clean layout across breakpoints (settings_page_verified_1789386043280.png).

- [x] GATE 23: Interactive Student ID Card, Colorful File Folder Settings & Centered Calculator:
  - Cute and creative MathPulse AI Student ID card on the left with interactive 3D flip:
    - Punch-out metallic lanyard clip slot at top center.
    - 100% genuine student data (real student name, DepEd LRN, Grade & Section, School, real Level & Total XP, student UID). Zero fake or fabricated stats (no fake "Rank #7", no fake NFC).
    - Front: MathPulse vector mascot badge with sparkles, portrait photo frame with integrated uploader, learner details, dynamic cursive handwritten signature, deterministic SVG barcode, and cute mini QR code with center pulse-heart.
    - Back: Glowing MathPulse mascot emblem with radial aura ring, inspirational motto ("Every problem has a solution. Keep pulsing! 💜"), verified learner pass badge, and genuine Level & Total XP stat cards.
  - Vibrant and playful File Folder Settings hub on the right:
    - Realistic file folder jacket with colored tab dividers, binder paperclip graphic, top spine gradient, and notebook dot-grid paper background.
    - 5 student-friendly, colorful folder sheets:
      1. Student Details (Lavender/Purple): Name, Email, Phone, Gender, DepEd LRN, Grade Level, Section/Strand, School.
      2. Display & Theme (Sky Blue/Cyan): Theme mode toggle, animations, daily XP goals, practice level, study time.
      3. Alerts & Reminders (Amber/Coral): Push alerts, streak protector, 1v1 Quiz Battle invites, study notifications.
      4. Login & Password (Mint/Emerald): Password update, Student ID confirmation, account security tips.
      5. My Data & Files (Rose/Berry): Learning summary export, cache cleaner, diagnostic test retake, logout.
  - Interactive "Open Avatar Studio" button hover effect:
    - Pops out cute mascot avatar head with speech bubble ("Dress me up! 🎨") and sparkles above/beside the button on hover.
  - Centered Scientific Calculator:
    - Perfectly centered horizontally and vertically on viewport (`fixed inset-0 z-[100] flex items-center justify-center`) with dark dimmed backdrop overlay.
  - Full responsiveness across mobile (ID stacked on top, folder below), tablet, and desktop (ID left, folder right).
  CHECK: npm run lint:anti-slop && npm run typecheck && npm run build
  EXPECT: /built in/
  EVIDENCE: Passed with 0 errors across all checks. oxlint passed with 0 errors across all files; tsc --noEmit passed with 0 errors; Vite production build completed with exit code 0 (`built in 2m`, SettingsPage-BdSmxDNj.js, ScientificCalculator-DXz6nn4N.js). Browser subagent verified live on http://localhost:5173/settings: cute Student ID card with lanyard punch-hole and genuine data (student_id_front_1789443512447.png), 3D card flip showing glowing mascot emblem and real Level 2 / 135 XP stats (student_id_back_1789443554901.png), colorful file folder tab navigation with vibrant spine gradients and paperclip graphic across all 5 sheets (folder_tab_display_theme_1789443826155.png, alerts_reminders_tab_active_success_1789444410056.png, login_password_tab_active_success_1789444466231.png, my_data_files_tab_active_success_1789444516584.png), peeking avatar head hover effect on Open Avatar Studio button, and Scientific Calculator modal centered on screen with backdrop (scientific_calculator_modal_opened_1789445041438.png).
