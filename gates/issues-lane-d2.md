# Gates: lane d2

Scope: issues #298 #297 #296 #295 #249 #247 #246 #258 #294 (Admin RAG manager, AI monitoring, file inventory, confirm modal, mobile nav, accessible names). Worktree `.worktrees/lane-d2`, branch `fix/issues-lane-d2`. CHECKs run under cmd.exe from the worktree root; vitest CHECKs use the local uncommitted `vitest.worktree.config.ts` (junctioned node_modules), use `vitest.config.ts` from the main checkout.

- [x] G298: RAG Manager shows a persistent error state with a Retry action when the inventory request fails, not the "No AI Knowledge Loaded Yet" empty state.
  CHECK: npx vitest run src/components/AdminRagManager.regression.test.tsx
  EXPECT: /Tests\s+(\d+) passed \(\1\)/
  EVIDENCE: Tests  3 passed (3) incl. "shows an error state with Retry when the inventory request fails"
- [x] G297: Accordion panel collapses on the first click (toggle treats an untouched key as expanded, matching the display default).
  CHECK: git grep -nF "!(prev[subjectKey] ?? true)" -- src/components/AdminRagManager.tsx
  EXPECT: [subjectKey]: !(prev[subjectKey] ?? true)
  EVIDENCE: src/components/AdminRagManager.tsx:289:      [subjectKey]: !(prev[subjectKey] ?? true),
- [x] G296: Pricing tooltip opens on focus and click as well as hover, and hides on blur.
  CHECK: git grep -c -E "onFocus=|onClick=|onBlur=" -- src/components/admin/ai-monitoring/PricingInfoTooltip.tsx
  EXPECT: PricingInfoTooltip.tsx:3
  EVIDENCE: src/components/admin/ai-monitoring/PricingInfoTooltip.tsx:3
- [x] G295: ConfirmModal is an alertdialog (aria-modal, labelled, described) and closes on Escape only while open.
  CHECK: npx vitest run src/components/__tests__/ConfirmModal.test.tsx
  EXPECT: /Tests\s+(\d+) passed \(\1\)/
  EVIDENCE: Tests  5 passed (5) incl. alertdialog labelling and Escape-closes-only-while-open
- [x] G249: File Inventory trash opens a ConfirmModal; no direct Firestore deleteDoc fallback; backend error surfaced in the toast.
  CHECK: node -e "const s=require('fs').readFileSync('src/components/admin/AdminPdfUpload.tsx','utf8');const n=(r)=>(s.match(r)||[]).length;console.log('deleteDoc='+n(/deleteDoc/g),'confirmModal='+n(/<ConfirmModal/g),'directTrash='+n(/onClick=\{\(\) => handleDeleteFile/g),'pendingTrash='+n(/onClick=\{\(\) => setPendingDelete\(file\)\}/g))"
  EXPECT: deleteDoc=0 confirmModal=1 directTrash=0 pendingTrash=2
  EVIDENCE: deleteDoc=0 confirmModal=1 directTrash=0 pendingTrash=2
- [x] G247: AI Monitoring shows an error message with a retry control when the summary request fails.
  CHECK: npx vitest run src/pages/admin/AIMonitoringPage.regression.test.tsx
  EXPECT: /Tests\s+(\d+) passed \(\1\)/
  EVIDENCE: Tests  3 passed (3) incl. "shows an error state with a retry control when metrics fail"
- [x] G246: Backend summary no longer fabricates cost/usage/cache figures (per-feature requests come from ai_usage_logs taskType; untracked figures are null and labelled "Not tracked"); hard-coded trend badges removed.
  CHECK: set PYTHONPATH=backend&& python -X utf8 -m pytest backend/tests/test_ai_monitoring_telemetry.py -q && node -e "const fs=require('fs');const page=fs.readFileSync('src/pages/admin/AIMonitoringPage.tsx','utf8');const api=fs.readFileSync('backend/routes/ai_monitoring.py','utf8');console.log('trend='+(page.match(/trend=/g)||[]).length,'constants='+(api.match(/total_requests = 6900|cache_hit_rate.: 0\./g)||[]).length)"
  EXPECT: /2 passed[\s\S]*trend=0 constants=0/
  EVIDENCE: 2 passed in 0.42s | trend=0 constants=0
- [x] G258: Mobile bottom nav highlights Curriculum when activeTab is 'Curriculum Control'.
  CHECK: git grep -n "isCurriculumActive =" -- src/components/admin/AdminMobileBottomNav.tsx
  EXPECT: activeTab === 'Curriculum Control' || activeTab === 'Subjects'
  EVIDENCE: src/components/admin/AdminMobileBottomNav.tsx:62:  const isCurriculumActive = activeTab === 'Curriculum Control' || activeTab === 'Subjects' || activeTab === 'Content';
- [x] G294: Icon-only buttons and Ingest PDF fields named in the issue have accessible names.
  CHECK: node -e "const fs=require('fs');const want={'src/components/ModulesPage.tsx':['aria-label=\"Close curriculum preview\"'],'src/components/InterventionStepGuide.tsx':['aria-label=\"Close step guide\"','aria-label=\"Send message\"'],'src/components/QuizMaker.tsx':['aria-label={`Decrease ','aria-label={`Increase '],'src/components/AdminRagManager.tsx':['aria-label=\"Clear search\"','aria-label={isExpanded','aria-label={`Remove '],'src/components/QuestionBankPanel.tsx':['htmlFor=\"question-bank-storage-path\"','id=\"question-bank-storage-path\"','htmlFor=\"question-bank-grade-level\"','id=\"question-bank-grade-level\"','htmlFor=\"question-bank-topic\"','id=\"question-bank-topic\"','aria-label=\"Refresh question bank\"']};const missing=Object.entries(want).flatMap(([f,ns])=>ns.filter((needle)=>!fs.readFileSync(f,'utf8').includes(needle)).map((needle)=>f+' '+needle));console.log('missing='+missing.length,missing.join('; '))"
  EXPECT: missing=0
  EVIDENCE: missing=0
- [x] G-E2E: known-bug tags removed from the e2e tests of fixed issues (#297 accordion, #247 failed metrics, #294 Ingest PDF labels).
  CHECK: node -e "const fs=require('fs');const files=['tests/e2e/admin/content-rag.e2e.ts','tests/e2e/admin/admin-systems.e2e.ts','tests/e2e/teacher/question-bank.e2e.ts'];console.log('known-bug='+files.reduce((sum,f)=>sum+(fs.readFileSync(f,'utf8').match(/known-bug/g)||[]).length,0))"
  EXPECT: known-bug=0
  EVIDENCE: known-bug=0
- [x] G-TSC: TypeScript passes.
  CHECK: npx tsc --noEmit && echo TSC_OK
  EXPECT: TSC_OK
  EVIDENCE: TSC_OK
- [x] G-LINT: ESLint passes on src with zero warnings.
  CHECK: npx eslint src --ext .ts,.tsx --max-warnings=0 && echo ESLINT_OK
  EXPECT: ESLINT_OK
  EVIDENCE: ESLINT_OK (exit 0, max-warnings=0)
- [x] G-OX: oxlint anti-slop passes.
  CHECK: npx oxlint --quiet && echo OX_OK
  EXPECT: OX_OK
  EVIDENCE: OX_OK (exit 0)
- [x] G-PY: backend monitoring tests pass.
  CHECK: set PYTHONPATH=backend&& python -X utf8 -m pytest backend/tests -q -k monitoring
  EXPECT: /^(?!.*failed).*\d+ passed/m
  EVIDENCE: -- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html | 15 passed, 584 deselected, 1 warning in 82.92s (0:01:22)
