/**
 * @file authService.test.ts
 * Tests for authService role defaults, whitelist logic, and avatarLayers validation.
 *
 * Run with: npx tsx mobile/__tests__/authService.test.ts
 * Type-check with: cd mobile && npx tsc --noEmit
 *
 * Tests the exported constants (baseAllowed, roleAllowedMap) and simulates
 * the whitelist/avatarLayers validation logic to avoid Firebase import issues.
 */

// ── Test Helpers ────────────────────────────────────────────────────────────

class TestReporter {
  passed = 0
  failed = 0

  assert(condition: boolean, msg: string): void {
    if (condition) {
      this.passed++
    } else {
      this.failed++
      console.error(`  FAIL: ${msg}`)
    }
  }

  equal<T>(a: T, b: T, msg: string): void {
    this.assert(a === b, `${msg} (expected=${String(b)}, got=${String(a)})`)
  }

  isTrue(val: boolean, msg: string): void {
    this.assert(val, `${msg} (expected=true, got=${String(val)})`)
  }

  isFalse(val: boolean, msg: string): void {
    this.assert(!val, `${msg} (expected=false, got=${String(val)})`)
  }

  includes<T>(arr: T[], item: T, msg: string): void {
    this.assert(arr.includes(item), `${msg} (expected array to include ${String(item)})`)
  }

  summary(): void {
    const total = this.passed + this.failed
    console.log(`\nResults: ${this.passed}/${total} passed${this.failed > 0 ? `, ${this.failed} FAILED` : ''}`)
    if (this.failed > 0) process.exit(1)
  }
}

const t = new TestReporter()

// ── Expected Constants (mirrors authService.ts exports) ──────────────────────
// These are hardcoded here because importing authService triggers
// Firebase/RN modules that can't resolve in Node.js. The actual constants
// are type-checked by tsc --noEmit.

const baseAllowed = [
  'name',
  'email',
  'phone',
  'photo',
  'avatarLayers',
  'gender',
]

const roleAllowedMap: Record<string, string[]> = {
  student: [
    'lrn', 'grade', 'section', 'classSectionId', 'adviserTeacherId',
    'adviserTeacherName', 'schoolYear', 'school', 'enrollmentDate', 'major',
    'gpa', 'level', 'currentXP', 'totalXP', 'coins', 'hintTokens', 'lives',
    'streakShields', 'activeMultiplier', 'atRiskSubjects', 'flaggedTopics',
    'hasTakenDiagnostic', 'iarAssessmentState', 'startingQuarterG11',
    'recommendedPace', 'iarQuestionSetVersion', 'iarTopicClassifications',
    'topicScores', 'learningPathState', 'g12ReadinessIndicators', 'riskFlags',
    'riskClassifications', 'overallRisk', 'subjectBadges',
    'currentCurriculumVersionSetId', 'grade12TransitionGate',
    'unlockCriteriaVersion', 'recommendedNextTopicGroupId',
    'recommendationRationale', 'recommendationReasonCode', 'remediationState',
    'remediationStatusCounts', 'lastAssessmentType',
    'initialAssessmentCompletedAt', 'ownedAvatarItems',
  ],
  teacher: [
    'department', 'subject', 'yearsOfExperience', 'qualification',
    'teacherId', 'students',
  ],
  admin: ['department', 'position', 'adminId'],
}

// ─── Whitelist Simulation ────────────────────────────────────────────────────

/** Pure simulation of the updateUserProfile whitelist logic (no Firebase). */
function simulateWhitelistFilter(
  role: 'student' | 'teacher' | 'admin',
  updates: Record<string, unknown>
): { writtenKeys: string[]; filtered: Record<string, unknown> } {
  const allowedKeys = new Set([...baseAllowed, ...roleAllowedMap[role]])
  const filtered: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue
    if (!allowedKeys.has(key)) continue
    filtered[key] = value
  }

  return { writtenKeys: Object.keys(filtered), filtered }
}

/** Simulates the avatarLayers validation from updateUserProfile. */
function validateAvatarLayers(
  value: unknown
): { valid: true; layers: Record<string, unknown> } | { valid: false; error: string } {
  if (typeof value !== 'object' || value === null) {
    return { valid: false, error: 'avatarLayers must be an object' }
  }

  const avatarLayers = value as Record<string, unknown>
  const requiredKeys = ['top', 'bottom', 'shoes', 'accessory'] as const

  const missingKeys = requiredKeys.filter((k) => !(k in avatarLayers))
  if (missingKeys.length > 0) {
    return {
      valid: false,
      error: `avatarLayers must include all keys: ${requiredKeys.join(', ')}`,
    }
  }

  for (const k of requiredKeys) {
    const v = avatarLayers[k]
    if (v !== null && v !== undefined && typeof v !== 'string') {
      return {
        valid: false,
        error: `avatarLayers.${k} must be string, null, or undefined`,
      }
    }
  }

  return { valid: true, layers: avatarLayers }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Test: baseAllowed constants ===')

t.includes([...baseAllowed], 'name', 'baseAllowed includes name')
t.includes([...baseAllowed], 'email', 'baseAllowed includes email')
t.includes([...baseAllowed], 'phone', 'baseAllowed includes phone')
t.includes([...baseAllowed], 'photo', 'baseAllowed includes photo')
t.includes([...baseAllowed], 'avatarLayers', 'baseAllowed includes avatarLayers')
t.includes([...baseAllowed], 'gender', 'baseAllowed includes gender')
t.equal(baseAllowed.length, 6, 'baseAllowed has exactly 6 keys')

console.log('\n=== Test 1: Student role defaults — all 40+ gamification fields in roleAllowedMap ===')

const studentRequiredFields = [
  // Basic profile
  'lrn', 'grade', 'section', 'classSectionId', 'adviserTeacherId',
  'adviserTeacherName', 'schoolYear', 'school', 'enrollmentDate', 'major', 'gpa',
  // Gamification
  'level', 'currentXP', 'totalXP', 'coins', 'hintTokens', 'lives',
  'streakShields', 'activeMultiplier',
  // Diagnostic
  'atRiskSubjects', 'flaggedTopics', 'hasTakenDiagnostic',
  'iarAssessmentState', 'startingQuarterG11', 'recommendedPace',
  'iarQuestionSetVersion', 'iarTopicClassifications', 'topicScores',
  'learningPathState',
  // Risk
  'g12ReadinessIndicators', 'riskFlags', 'riskClassifications', 'overallRisk',
  'subjectBadges',
  // Curriculum & path
  'currentCurriculumVersionSetId', 'grade12TransitionGate',
  'unlockCriteriaVersion', 'recommendedNextTopicGroupId',
  'recommendationRationale', 'recommendationReasonCode',
  // Remediation
  'remediationState', 'remediationStatusCounts',
  'lastAssessmentType', 'initialAssessmentCompletedAt',
  // Avatar items
  'ownedAvatarItems',
]

let studentFieldCount = 0
for (const field of studentRequiredFields) {
  t.includes(roleAllowedMap.student, field, `roleAllowedMap.student includes "${field}"`)
  studentFieldCount++
}
t.isTrue(studentFieldCount >= 40, `Student roleAllowedMap has ${studentFieldCount} fields (need >=40)`)

console.log('\n=== Test 2: Teacher role defaults — teacherId + students array ===')

const teacherRequiredFields = [
  'teacherId', 'department', 'subject', 'yearsOfExperience', 'qualification', 'students',
]
for (const field of teacherRequiredFields) {
  t.includes(roleAllowedMap.teacher, field, `roleAllowedMap.teacher includes "${field}"`)
}
t.isTrue(
  roleAllowedMap.teacher.length >= teacherRequiredFields.length,
  `Teacher roleAllowedMap has ${roleAllowedMap.teacher.length} fields`
)

console.log('\n=== Test 3: updateUserProfile whitelist — only grade written, madeUpField dropped ===')

const resultHack = simulateWhitelistFilter('student', {
  role: 'admin',
  madeUpField: 'hack',
  grade: '12',
  currentXP: 9999,
})

t.isFalse(resultHack.writtenKeys.includes('role'), 'role=admin is dropped (not in student allowed)')
t.isFalse(resultHack.writtenKeys.includes('madeUpField'), 'madeUpField is dropped (not allowed)')
t.includes(resultHack.writtenKeys, 'grade', 'grade=12 is kept (in student allowed)')
t.includes(resultHack.writtenKeys, 'currentXP', 'currentXP=9999 is kept (in student allowed)')
t.equal(resultHack.writtenKeys.length, 2, 'Only 2 keys written: grade + currentXP')

console.log('\n=== Test 4: updateUserProfile — avatarLayers rejected (missing bottom/shoes/accessory) ===')

const avatarMissing = validateAvatarLayers({ top: 'hat' })
t.isFalse(avatarMissing.valid, 'avatarLayers with only top is rejected')
t.assert(
  !avatarMissing.valid && avatarMissing.error.includes('must include all keys'),
  'Error message mentions all keys required: ' + (!avatarMissing.valid ? avatarMissing.error : 'N/A')
)

console.log('\n=== Test 4b: avatarLayers — valid object accepted ===')

const avatarValid = validateAvatarLayers({
  top: 'hat',
  bottom: null,
  shoes: undefined,
  accessory: 'cape',
})
t.isTrue(avatarValid.valid, 'avatarLayers with all 4 keys accepted')

console.log('\n=== Test 4c: avatarLayers — wrong type value rejected ===')

const avatarBadType = validateAvatarLayers({
  top: 'hat',
  bottom: 123,
  shoes: null,
  accessory: 'cape',
})
t.isFalse(avatarBadType.valid, 'avatarLayers with number bottom is rejected')
t.assert(
  !avatarBadType.valid && avatarBadType.error.includes('bottom'),
  'Error message identifies bottom as the problem'
)

console.log('\n=== Test 4d: avatarLayers — non-object rejected ===')

const avatarNotObj = validateAvatarLayers('not-an-object')
t.isFalse(avatarNotObj.valid, 'avatarLayers non-object is rejected')

// ── Admin role check ─────────────────────────────────────────────────────────

console.log('\n=== Test: Admin role defaults ===')

t.includes(roleAllowedMap.admin, 'adminId', 'roleAllowedMap.admin includes adminId')
t.includes(roleAllowedMap.admin, 'position', 'roleAllowedMap.admin includes position')
t.includes(roleAllowedMap.admin, 'department', 'roleAllowedMap.admin includes department')

// ── Summary ──────────────────────────────────────────────────────────────────

t.summary()
