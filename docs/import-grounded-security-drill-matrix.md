# Import-Grounded Class-Scope Security Drill Matrix

Date: 2026-03-30
Owner: Copilot execution assist
Environment: Local FastAPI TestClient harness + targeted pytest execution
Build SHA: f4067c1

## Endpoint Matrix

| endpoint | actor | target_class_section_id | expected_visibility | expected_status | actual_status | leakage_detected | notes | evidence_ref |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| /api/upload/course-materials/recent | teacher_a | class_owned_by_a | visible | 200 | 200 (materials=1 in class-filter test) | no | Pytest node `TestRecentCourseMaterials::test_recent_course_materials_respects_class_section_filter` passed. | sec-001 |
| /api/upload/course-materials/recent | teacher_a | class_owned_by_b | not visible | 200 empty or rejection | 200 (materials=0 for class_b under mixed-teacher harness) | no | Local harness seeded class_b under other teacher; endpoint returned empty list. | sec-002 |
| /api/course-materials/topics | teacher_a | class_owned_by_a | visible | 200 | 200 (topics=1, materials=1) | no | Local harness with owned `class_a` topic document returned scoped payload. | sec-003 |
| /api/course-materials/topics | teacher_a | class_owned_by_b | not visible | 200 empty or rejection | 200 (topics=0, materials=0) | no | Mixed-teacher dataset produced empty payload for non-owned `class_b`. | sec-004 |
| /api/upload/class-records/risk-refresh/recent | teacher_a | class_owned_by_a | visible | 200 | 200 (jobs=1 for class_a) | no | Local harness with patched stats doc support returned owned job only. | sec-005 |
| /api/upload/class-records/risk-refresh/recent | teacher_a | class_owned_by_b | not visible | 200 empty or rejection | 200 (jobs=0 for class_b) | no | Same harness filtered out non-owned class job. | sec-006 |
| /api/feedback/import-grounded/summary | teacher_a | class_owned_by_a | visible | 200 | 200 (totalEvents=1, classRates=1) | no | Mixed-teacher telemetry harness returned owned class aggregates only. | sec-007 |
| /api/feedback/import-grounded/summary | teacher_a | class_owned_by_b | not visible | 200 empty or isolated teacher scope | 200 (totalEvents=0, classRates=0, warning=no events) | no | Non-owned class filter returned empty/isolated telemetry response. | sec-008 |

## Drill Procedure
1. Authenticate as teacher A and capture token.
2. Execute requests against teacher A-owned class section IDs and record baseline visibility.
3. Execute same requests against teacher B class section IDs.
4. Confirm no cross-class payload leakage in response bodies.
5. Record expected vs actual status, leakage flag, and evidence reference.

## Leak Definition
Leakage is confirmed if any response returns another teacher's class records, topics, risk-refresh jobs, or telemetry aggregates with identifiable class data.

## Decision Check
- Pass if all `leakage_detected` values are `no`.
- Fail if any row has `leakage_detected = yes`.

Result: Pass (all executed rows returned `leakage_detected = no`).
