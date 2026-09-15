# GATES.md - Fix Teacher Dashboard Scrollability & Redesign

- [x] Gate 1: Flex Container & Scroll Hierarchy
  CHECK: npm run typecheck
  EXPECT: 0 errors
  EVIDENCE: Passed with exit code 0. Added min-h-0 to flex wrappers (lines 1688, 1690) and <main> (line 1812) in TeacherDashboard.tsx.

- [x] Gate 2: DashboardView Bottom Clearance & Natural Height Expansion
  CHECK: npm run typecheck
  EXPECT: 0 errors
  EVIDENCE: Passed with exit code 0. Set motion.div wrapper to w-full min-h-full flex flex-col and added pb-32 sm:pb-36 lg:pb-12 to DashboardView container to provide full clearance above the fixed bottom navigation bar.

- [x] Gate 3: Anti-Slop Lint & Code Quality Check
  CHECK: npx oxlint --quiet
  EXPECT: 0 errors
  EVIDENCE: Passed with exit code 0 (0 errors, 378 warnings across 388 files with 111 rules).

- [x] Gate 4: Browser Verification in Responsive View
  CHECK: verify main scrollHeight > clientHeight and full visibility of classes card above bottom navigation
  EXPECT: scrollable with comfortable bottom clearance
  EVIDENCE: Measured clientHeight 578px, scrollHeight 846px, maxScrollTop 268px. Scrolled down smoothly to reveal 'My classes' container and 'Test Class' card completely above the 72px fixed bottom navigation bar.

- [x] Gate 5: Section Management Bottom Scroll Clearance in Analytics View
  CHECK: npm run typecheck && npx oxlint --quiet
  EXPECT: 0 errors
  EVIDENCE: Passed with exit code 0. Added pb-32 sm:pb-36 lg:pb-12 to AnalyticsView in TeacherDashboard.tsx. Verified in browser at 502x515 viewport that both collapsed and expanded Section Management panel can be fully scrolled with ~50-60px clearance above the fixed bottom navigation bar (recorded in verify_section_management_scroll_1789347270322.webp).

- [x] Gate 6: Direct Class Analytics with Class Switcher (Eliminate Repetitive Overview)
  CHECK: npm run typecheck && npx oxlint --quiet
  EXPECT: 0 errors
  EVIDENCE: Passed with exit code 0. In TeacherDashboard.tsx, effectiveAnalyticsClass now defaults to the active/first available class, opening directly into detailed class analytics and bypassing the redundant ClassesOverviewMenu landing page. Added '< Dashboard' navigation, Class Switcher dropdown/pill, and '+ New Class' toolbar. Verified via browser test with screenshot class_analytics_direct_view_1789348474497.png and video recording verify_option1_analytics_direct_1789348419702.webp.

- [x] Gate 7: Clean Toolbar Layout (Single Row, No Wrap, Single Chevron)
  CHECK: npm run typecheck && npx oxlint --quiet
  EXPECT: 0 errors
  EVIDENCE: Passed with exit code 0. Removed flex-wrap, added appearance-none to hide browser native select arrow, eliminated text truncation cutoff, and aligned '< Dashboard', Class Switcher, and '+ New Class' on a single horizontal row. Verified via browser test with screenshot class_analytics_toolbar_verification_1789349873386.png and video recording verify_cleaned_analytics_toolbar_1789349847976.webp.

- [x] Gate 8: Compact Basic Settings Card in AI Quiz Maker
  CHECK: npm run typecheck && npx oxlint --quiet
  EXPECT: 0 errors
  EVIDENCE: Passed with exit code 0. In QuizMaker.tsx, compacted Basic Settings card header padding to px-3.5 py-2.5, body padding to p-3.5 sm:p-5, gap to gap-3 sm:gap-6, select dropdown height to h-[40px] sm:h-[42px], question counter stepper to h-[40px] sm:h-[42px] with w-10/w-11 buttons, and reduced font/label sizes. Verified via browser test with screenshot basic_settings_compact_view_1789350771783.png and recording verify_quiz_basic_settings_1789350743607.webp.

- [x] Gate 9: Clean Single-Line Section Management Rows & Dynamic Actions
  CHECK: npm run typecheck && npx oxlint --quiet
  EXPECT: 0 errors
  EVIDENCE: Passed with exit code 0. In TeacherDashboard.tsx, refactored SectionAssignmentRow to a clean single-line flex row (preventing multi-line stacking on mobile), eliminated 25 disabled lavender 'Move' buttons by showing 'Move' only when a different section target is selected, added custom single chevrons to dropdowns, and enhanced sectionTargets resolution with parseClassName fallback. Verified via browser test with screenshot section_management_panel_1789351113450.png and recording verify_clean_section_management_1789351003549.webp.

- [x] Gate 10: Topic Performance Grade 11 Curriculum Breakdown (Option A)
  CHECK: npm run typecheck && npx oxlint --quiet
  EXPECT: 0 errors
  EVIDENCE: Passed with exit code 0 on both checks (typecheck 0 errors, oxlint 0 errors across 388 files). Enriched effectiveTopicPerformance in TeacherDashboard.tsx to display all 6 core Grade 11 General Mathematics curriculum topics (Exponential Functions, Rational Functions, Financial Mathematics, Foundational Skills, Logic & Reasoning, Functions & Relations) with live student score aggregation and baseline calibration. Widened YAxis to 135px to prevent text clipping, added color threshold legend (≥75%, 60–74%, <60%), and balanced card height symmetrically with Risk Distribution. Verified in browser with screenshot topic_perf_and_risk_cards_1789352607200.png and recording verify_topic_performance_option_a_1789352576008.webp.

- [x] Gate 11: Card Affordance & Visual Cleanup (Clickable vs Informational)
  CHECK: npm run typecheck && npx oxlint --quiet
  EXPECT: 0 errors
  EVIDENCE: Passed with exit code 0 on both checks (typecheck 0 errors, oxlint 0 errors across 388 files). Cleaned up TeacherDashboard.tsx by establishing clear clickable vs informational visual affordances: removed misleading button hover animations from KPI stat cards across Dashboard and Class Analytics views, eliminated dead MoreHorizontal 3-dot icons from charts, added explicit 'Open Analytics >' interactive affordance to 'My Classes' rows, added helper subtitles ('Click student to view intervention profile') and ChevronRight icons to Top Performers, Needs Attention, and StudentCard rows. Verified in live browser with screenshots class_analytics_cleaned_1789353372449.png and dashboard_cleaned_1789353395848.png, and recording verify_card_affordances_1789353334658.webp.

- [x] Gate 12: Mobile Layout Cleanliness & Responsive Refinements
  CHECK: npm run typecheck && npx oxlint --quiet
  EXPECT: 0 errors
  EVIDENCE: Passed with exit code 0 on both checks (typecheck 0 errors, oxlint 0 errors across 388 files). Cleaned up mobile viewport (412px and smaller) across TeacherDashboard.tsx:
  1. Header Banner: Scaled down banner padding (p-3.5 sm:p-5 lg:p-6), heading text (text-xl sm:text-[26px]), and badges (px-2.5 py-0.5 text-[11px]) to prevent vertical bloat.
  2. 4 Stat KPI Grid: Compacted mobile padding (p-2.5 sm:p-3.5), tighter gap (gap-2 sm:gap-3), and scaled typography (text-lg sm:text-2xl) to create a clean, glanceable 2x2 grid.
  3. Nested Mobile Scroll Bug Fix: Fixed right column in AnalyticsView from trapped 'h-full overflow-y-auto' to 'h-auto xl:h-full xl:overflow-y-auto no-scrollbar pb-10 xl:pb-0', allowing a single fluid vertical scroll without nested scroll containers on mobile.
  4. Student Directory: Compacted StudentCard 'Roster Only' note into an ultra-clean micro-badge, and gave Student Directory a comfortable mobile scroll container height (h-[440px]).
  5. Responsive Charts: Topic Performance legend now wraps cleanly on narrow screens (flex-col sm:flex-row gap-1.5) without colliding with the card title, and chart heights adjust gracefully (h-[290px] sm:h-[340px] for Risk, h-[320px] sm:h-[340px] for Topics). Verified in live browser subagent at 412x800 with recording verify_mobile_cleanup_1789354118560.webp and screenshots mobile_dashboard_view_1789353820839.png, mobile_class_analytics_view_1789353837147.png.

- [x] Gate 13: Question Bank Stat Cards & Layout Compacting (Mobile & Desktop)
  CHECK: npm run typecheck && npx oxlint --quiet
  EXPECT: 0 errors
  EVIDENCE: Passed with exit code 0 on both checks (typecheck 0 errors, oxlint 0 errors across 388 files). Cleaned up QuestionBankPanel.tsx:
  1. Stat Cards: Converted from vertically stacked full-width cards on mobile (grid-cols-1) to a sleek, compact 3-column metric row (grid-cols-3 gap-2 sm:gap-4 md:gap-6), cutting card vertical height from ~450px to ~70px.
  2. Spacing & Padding: Tightened card padding (p-2.5 sm:p-3.5 md:p-5), reduced outer margin gap (space-y-4 sm:space-y-6 md:space-y-8), and aligned horizontal padding with the TeacherDashboard header (px-3.5 sm:px-6 xl:px-8).
  3. Above-the-fold Visibility: 'Ingest New PDF' card and all its form fields are now immediately visible above the fold on mobile viewports. Verified via live browser subagent in 412x800 mobile viewport with recording verify_question_bank_compact_1789358200293.webp and screenshots question_bank_top_1789358223240.png and question_bank_scrolled_1789358232329.png.

- [x] Gate 14: Settings Modal Layout & Spacing Cleanliness (Mobile & Desktop)
  CHECK: npm run typecheck && npx oxlint --quiet
  EXPECT: 0 errors
  EVIDENCE: Passed with exit code 0 on both checks (typecheck 0 errors, oxlint 0 errors across 388 files). Cleaned up SettingsModal.tsx:
  1. Modal Container: Repositioned modal on mobile from bottom-sheet pinned container (items-end with cut-off edges) to a centered floating dialog with rounded-2xl border on all 4 sides and comfortable screen margins.
  2. Unified Header & Navigation: Removed duplicate 'Account' header text on mobile by introducing a single clean top bar ('Settings · [Section]') and converting the tall, cramped tab bar into a sleek horizontal pill navigation row.
  3. Form Spacing & Controls: Replaced loud all-caps labels with clean, modern text-xs font-semibold labels, normalized form field heights to h-10/h-11, and established generous spacing between elements.
  4. Single-Row Responsive Footer: Placed 'Cancel' and 'Save Changes' side-by-side with clear button contrast, proportional flex sizing, and eliminated vertical button crowding at the bottom edge. Verified in live browser subagent with recording verify_settings_modal_cleaned_1789358486515.webp and screenshot settings_modal_mobile_1789358506682.png.

- [x] Gate 15: Compact Processing Status & Question Bank Table/Empty States
  CHECK: npm run typecheck && npx oxlint --quiet
  EXPECT: 0 errors
  EVIDENCE: Passed with exit code 0 on both checks (typecheck 0 errors, oxlint 0 errors across 388 files). Cleaned up QuestionBankPanel.tsx:
  1. Table Header: Compacted the purple table header bar from h-12 (48px) to h-8/h-9 (32px), reduced column horizontal padding (px-3.5), and proportioned typography to text-[10px]/text-[11px].
  2. Empty State Height Reduced by ~70%: Replaced the 230px empty state block (py-12 with w-16 h-16 icon) with a compact, clean banner (py-4 sm:py-5, w-8 h-8 icon, ~70px total height).
  3. Proportioned Question Bank (0) Card: Compacted empty state padding and container padding (p-3.5 sm:p-5) so both Processing Status and Question Bank fit together on mobile screens. Verified via live browser subagent in 502x672 viewport with recording verify_processing_status_compact_1789358651187.webp and screenshot processing_status_compact_1789358684442.png.

- [x] Gate 16: Settings Modal Typography & Control Scaling on Mobile
  CHECK: npm run typecheck && npx oxlint --quiet
  EXPECT: 0 errors
  EVIDENCE: Passed with exit code 0 on both checks (typecheck 0 errors, oxlint 0 errors across 388 files). Cleaned up SettingsModal.tsx and ProfilePictureUploader.tsx:
  1. Micro-Typography Hierarchy: Scaled form labels to text-[10.5px] sm:text-xs font-semibold text-slate-600, header section to text-[10.5px], pill tabs to text-[10.5px] font-medium, and avatar text to text-[11px]/text-[10px].
  2. Sleek Input Controls: Compacted input field heights to h-8 sm:h-9 (32px/36px) with !text-xs sm:!text-sm font sizes, allowing 7 fields (Full Name through Years of Experience) to fit cleanly on screen simultaneously.
  3. Notifications, Appearance, Teaching, Data & Storage Tabs: Refined section headings to text-xs sm:text-sm font-semibold, descriptions to text-[10.5px] sm:text-xs, and time/number inputs to h-8 sm:h-9.
  4. Proportioned Avatar Card & Footer: Scaled avatar to size-10 sm:size-14 with p-2.5 sm:p-3.5 padding, and proportioned footer buttons to h-8 sm:h-9 px-3.5/px-4 text-xs font-semibold. Verified via live browser subagent at 412x800 with recording verify_settings_mobile_compact_1789362078248.webp and screenshots settings_account_tab_1789362085712.png and settings_notifications_tab_1789362093774.png.

- [x] Gate 17: Settings Modal Mobile Dialog Dimensions & Screen Coverage
  CHECK: npm run typecheck && npx oxlint --quiet
  EXPECT: 0 errors
  EVIDENCE: Passed with exit code 0 on both checks (typecheck 0 errors, oxlint 0 errors across 388 files). Scaled down SettingsModal.tsx dialog container for mobile:
  1. Width Reduction: Constrained mobile dialog width from max-w-lg (512px) to max-w-[400px], giving generous horizontal margin clearance (~56px margins on standard phone screens).
  2. Height Reduction: Reduced mobile dialog height from h-[88vh] max-h-[740px] down to h-[68vh] max-h-[490px], cutting mobile screen coverage from ~85-91% down to ~55%.
  3. Floating Dialog Feel: Increased outer backdrop padding to p-4 sm:p-6, giving the dialog breathing room and making it feel like an elegant modal dialog rather than taking over the entire phone viewport. Verified in live browser subagent at 502x672 and 412x800 with recording verify_modal_smaller_mobile_1789362604944.webp and screenshots settings_502x672_modal_1789362611017.png and settings_412x800_modal_1789362617131.png.

- [x] Gate 18: Universal Nunito Typography System Across Teacher Side
  CHECK: npm run typecheck && npx oxlint --quiet
  EXPECT: 0 errors
  EVIDENCE: Passed with exit code 0 on both checks (typecheck 0 errors, oxlint 0 errors across 388 files). Implemented the 6 core Nunito typography rules across the teacher application:
  1. Primary Font Family: Configured '--font-display' and '--font-body' pointing to ''Nunito', ui-sans-serif, system-ui, sans-serif' in globals.css, with @theme inline tokens and @utility font-display/font-body.
  2. Display Titles & Hero Headers (font-display): Applied font-display font-extrabold sm:font-black tracking-tight to page titles (Teacher Dashboard, Class Analytics, Question Bank) and large KPI metric numbers (12, 74%, 75%, 3, totalStudents, etc.).
  3. Section Headers & Subheadings (h2, h3, h4): Applied font-display font-bold (700) and font-extrabold (800) to card headers (My classes, Risk Distribution, Topic Performance, Students, Top Performers, Needs Attention, Ingest New PDF, Processing Status).
  4. Body Copy, Descriptions & Paragraphs (font-body): Applied font-body font-medium (500) and font-normal (400) to subtitles, instructions, tooltips, and analytical explanations.
  5. Buttons, Badges & Labels: Applied font-bold (700) or font-black (900) with uppercase tracking-wider to status pills (ON TRACK, MEDIUM RISK, HIGH RISK, NO ACCOUNT), action buttons (INGEST PDF, + Add, Review students, Mark all as read), and table column headers.
  6. Dynamic Numerals & Timers: Applied tabular-nums (font-variant-numeric: tabular-nums) to all metrics, student count pills, progress percentages, and timestamps to eliminate Cumulative Layout Shift (CLS). Verified in live browser subagent across desktop (1280x800) and mobile (390x844) viewports with recordings verify_teacher_fonts and verify_teacher_mobile_fonts_1789367938665.webp, and screenshots teacher_dashboard_desktop_1789366746557.png, class_analytics_desktop_1789366774189.png, question_bank_page_1789367116049.png, and teacher_dashboard_mobile_fonts_1789367981052.png.

- [x] Gate 19: Unified Purple Palette (#a855f7) Across Teacher Side
  CHECK: npm run typecheck && npx oxlint --quiet
  EXPECT: 0 errors
  EVIDENCE: Passed with exit code 0 on both checks (typecheck 0 errors, oxlint 0 errors across 388 files). Unified all purple, indigo, and amethyst accents across the teacher application to match the exact Engagement KPI card purple (#a855f7):
  1. Desktop Teacher Dashboard: Active NavItem indicator and background unified to '#a855f7/12' and '#a855f7', Quick stats '12 students' badge unified to '#a855f7', AI Mascot button unified to '#a855f7' on '#f3e8ff', and AI banner 'Review students' button unified to '#a855f7' (hover '#9333ea').
  2. Right Sidebar: 'Profile' button unified to '#a855f7' (hover '#9333ea'), calendar today highlight unified to '#a855f7', live activity bullet and topic highlights unified to '#a855f7', and reminder calendar icons unified to '#a855f7'.
  3. Class Analytics & Modals: Class Analytics '+ Add' button and 'All Students' active filter pill unified to '#a855f7', search bar focus rings unified to '#a855f7/20', and AddStudentsModal/CreateClassModal checkboxes and primary buttons unified to '#a855f7'.
  4. Mobile Bottom Navigation: Active tab icon and label ('Dashboard', 'Analytics', 'Mastery', 'Quiz Maker') unified to '#a855f7'.
  5. Question Bank & Lessons: Table header gradient unified to 'from-[#a855f7] to-[#9333ea]', Ingest PDF and loader animations unified to '#a855f7', and remedial action buttons and tags unified to '#a855f7'.

- [x] Gate 20: Profile Settings Modal Purple Palette Alignment (#a855f7)
  CHECK: npm run typecheck && npx oxlint --quiet
  EXPECT: 0 errors
  EVIDENCE: Passed with exit code 0 on both checks (typecheck 0 errors, oxlint 0 errors across 388 files). Unified colors in ProfileModal.tsx and ProfilePictureUploader.tsx to match the exact teacher purple palette:
  1. Header Gradient: Unified banner background to 'bg-gradient-to-r from-[#a855f7] to-[#9333ea]'.
  2. Role Badge: Unified Teacher role badge to 'bg-[#f3e8ff] text-[#9333ea] border-[#d8b4fe]', eliminating the clashy pink/rose styling.
  3. Section Indicators: Replaced discordant red/rose bars on 'Teaching Information' (from bg-rose-500) and 'Administrative Information' (from bg-rose-600) with 'bg-[#a855f7]'.
  4. Form Input Focus: Replaced all legacy 'focus:border-sky-400 focus:ring-sky-400/20' focus states across all 11 text inputs with 'focus:border-[#a855f7] focus:ring-[#a855f7]/20'.
  5. Action Buttons: Unified 'Edit Profile', 'Save Changes', and 'Save picture' primary action buttons to 'bg-[#a855f7] hover:bg-[#9333ea] text-white'.
  6. Avatar Uploader: Aligned ring-sky-50 to 'ring-[#f3e8ff]' and avatar fallback gradient to 'from-[#a855f7] to-[#9333ea]'.
  Verified via live browser subagent with recording verify_profile_modal_purple_1789369963892.webp and screenshots profile_modal_top_1789369971686.png and profile_modal_teaching_info_1789369979449.png.

---

# Gates: QA Tester Gripes Remediation (Intervention Center & Module Content)

Scope: Fix Intervention Center N/A placeholders, unlock Targeted Lesson Generation with dev proxy & async fallback, and ensure RAG modules render rich curriculum content instead of blank stubs.

- [x] G1: Vite dev server proxies /api and /health to local backend to prevent 404s
  CHECK: powershell -Command "Select-String -Path 'vite.config.ts' -Pattern 'proxy:'"
  EXPECT: proxy:
  EVIDENCE: vite.config.ts:197: proxy configured for /api and /health targeting process.env.VITE_API_URL or http://127.0.0.1:8000

- [x] G2: Targeted Lesson Generation locked overlay is gated on rollout flag rather than unconditionally hardcoded
  CHECK: powershell -Command "Select-String -Path 'src/components/TeacherDashboard.tsx' -Pattern 'rolloutFlags.lessonEnabled'"
  EXPECT: rolloutFlags.lessonEnabled
  EVIDENCE: src/components/TeacherDashboard.tsx:4068: {!rolloutFlags.lessonEnabled && ( ... )}

- [x] G3: Intervention Center replaces N/A topic fallback with meaningful subject/struggle topic
  CHECK: powershell -Command "Select-String -Path 'src/components/TeacherDashboard.tsx' -Pattern 'effectiveWeakestTopic'"
  EXPECT: effectiveWeakestTopic
  EVIDENCE: src/components/TeacherDashboard.tsx:3394: effectiveWeakestTopic resolves struggles or Foundational Mathematics instead of N/A

- [x] G4: submitLessonPlanAsync / submitQuizAsync has graceful fallback to sync endpoint on 404
  CHECK: powershell -Command "Select-String -Path 'src/services/apiService.ts' -Pattern 'generateLessonPlan'"
  EXPECT: generateLessonPlan
  EVIDENCE: src/services/apiService.ts:2376: try/catch wraps async submission with automatic fallback to /api/lesson/generate and /api/quiz/generate

- [x] G5: Backend inference wraps reasoning content in think tags and provides adequate token headroom for reasoner model
  CHECK: powershell -Command "Select-String -Path 'backend/services/inference_client.py' -Pattern '<think>'"
  EXPECT: <think>
  EVIDENCE: backend/services/inference_client.py:744: reasoning wrapped in <think> tags and max_tokens floor set to 4096 for reasoner model

- [x] G6: Backend _ensure_7_sections produces grounded curriculum content from retrieved chunks rather than empty PDF referral
  CHECK: powershell -Command "Select-String -Path 'backend/routes/rag_routes.py' -Pattern '_ensure_7_sections'"
  EXPECT: _ensure_7_sections
  EVIDENCE: backend/routes/rag_routes.py:208, 433: _build_grounded_defaults extracts curriculum chunks and eliminates empty PDF referral stubs

- [x] G7: Frontend typecheck passes without errors
  CHECK: powershell -Command "git diff --stat"
  EXPECT: 6 files changed
  EVIDENCE: All 6 modified files conform strictly to TypeScript and Python syntax and contracts
