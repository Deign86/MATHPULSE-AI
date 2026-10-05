# Group B+F acceptance gates

- [ ] TC-TCH-051: Generate five questions from selected Financial Mathematics topic.
  CHECK: npm test -- --run
  EXPECT: requested count and selected topic are preserved in generated quiz.
- [ ] TC-TCH-069: Quiz generation respects the 12-question cap.
  CHECK: npm test -- --run
  EXPECT: a request for 13 questions is capped at 12 before backend submission.
- [ ] TC-TCH-070: Generate five questions with a title matching the selected topic.
  CHECK: npm test -- --run
  EXPECT: selected topic, count, and generated title are retained.
- [ ] TC-TCH-072: Invalid PDF storage paths fail promptly with a safe client error.
  CHECK: pytest -q -k quiz
  EXPECT: invalid paths do not block on storage I/O or return raw 500 details.
- [ ] TC-ADM-076: Teacher creation does not require a student section.
  CHECK: npm test -- --run
  EXPECT: teacher form validates and submits without a section.
- [ ] TC-ADM-081: AI Monitoring displays daily, latency, and success metrics.
  CHECK: npm run typecheck
  EXPECT: metric fields render from platform telemetry rather than being omitted.
- [ ] TC-ADM-095: Subject enable/disable changes appear without a page refresh.
  CHECK: npm test -- --run
  EXPECT: subject state is refreshed or reconciled after a successful toggle.
- [ ] TC-ADM-098: Admin analytics metrics and exports use live data.
  CHECK: npm test -- --run
  EXPECT: frozen KPI constants and mock export rows are not presented as live data.
