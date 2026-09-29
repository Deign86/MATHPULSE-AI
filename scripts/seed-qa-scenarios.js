'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PROJECT_ID = 'mathpulse-ai-2026';
const EXPECTED_KEY_RE = /^mathpulse-ai-2026-firebase-adminsdk-.*\.json$/i;
const MARKER = 'qa-sheet-scenarios-v1';
const ROOT = path.resolve(__dirname, '..');
const DEEPWORK = path.join(ROOT, '.slim', 'deepwork');
const PLAN_PATH = path.join(DEEPWORK, 'qa-seed-dry-run.json');
const MANIFEST_PATH = path.join(DEEPWORK, 'qa-seed-manifest.json');
const ORIGIN_PATH = path.join(DEEPWORK, 'qa-seed-origin.json');
const CREDENTIALS_PATH = path.join(DEEPWORK, 'qa-auth-credentials.json');
const MANUAL_QA_PATH = path.join(DEEPWORK, 'qa-seed-manual-qa.md');

const IDs = {
  teacher: 'qa_teacher_primary',
  teacher2: 'qa_teacher_private',
  studentA: 'qa_student_a',
  studentB: 'qa_student_b',
  classroom: 'qa_class_risk_bands',
  privateClassroom: 'qa_class_private',
  section: 'qa_section_risk_bands',
  privateSection: 'qa_section_private',
  quiz: 'qa_generated_functions_review',
  assignment: 'qa_assignment_student_a',
  submission: 'qa_submission_student_a',
  calendar: 'qa_calendar_nav_prereq',
  diagnosticPrereqQuiz: 'qa_generated_diagnostic_prereq',
};

const ACCOUNTS = [
  { uid: IDs.teacher, email: 'qa.teacher.primary@mathpulse.ai', name: 'QA Teacher Primary', role: 'teacher' },
  { uid: IDs.teacher2, email: 'qa.teacher.private@mathpulse.ai', name: 'QA Teacher Private', role: 'teacher' },
  { uid: IDs.studentA, email: 'qa.student.a@mathpulse.ai', name: 'QA Student A', role: 'student' },
  { uid: IDs.studentB, email: 'qa.student.b@mathpulse.ai', name: 'QA Student B', role: 'student' },
];

function parseArgs(argv) {
  const flags = new Set(argv.filter((arg) => arg.startsWith('--')));
  const targetAt = argv.indexOf('--target');
  const target = targetAt >= 0 ? argv[targetAt + 1] : '';
  if (flags.has('--dry-run') === flags.has('--apply')) {
    throw new Error('Choose exactly one mode: --dry-run or --apply.');
  }
  if (flags.has('--target') && !target) throw new Error('--target requires a project ID.');
  if (target !== PROJECT_ID) throw new Error(`Refusing target ${target || '(missing)'}; --target ${PROJECT_ID} is required.`);
  if (argv.some((arg) => arg.startsWith('--') && !['--target', '--dry-run', '--apply'].includes(arg))) {
    throw new Error('Unsupported command-line flag.');
  }
  return { mode: flags.has('--dry-run') ? 'dry-run' : 'apply', target };
}

function assertRuntimeKey() {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyPath || !EXPECTED_KEY_RE.test(path.basename(keyPath))) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS must be set to the approved service-account file (kept outside the repo).');
  }
  if (path.resolve(keyPath).toLowerCase().startsWith(`${ROOT.toLowerCase()}${path.sep}`)) {
    throw new Error('Refusing service-account file inside the repository; keep credentials outside the repo.');
  }
  if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error('Emulator environment detected; refusing to continue.');
  }
  if (!fs.existsSync(keyPath)) throw new Error('Approved service-account file is missing.');
  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  if (serviceAccount.project_id !== PROJECT_ID) throw new Error('Service-account project ID does not match the required production project.');
  return serviceAccount;
}

function makeFixtures(admin, now) {
  const timestamp = admin.firestore.Timestamp;
  const daysAgo = (days) => timestamp.fromDate(new Date(now.getTime() - days * 86400000));
  const profile = (account, extra = {}) => ({
    uid: account.uid,
    email: account.email,
    name: account.name,
    displayName: account.name,
    role: account.role,
    photo: '',
    createdAt: timestamp.fromDate(now),
    updatedAt: timestamp.fromDate(now),
    qaOwner: true,
    qaSeed: MARKER,
    ...(account.role === 'teacher'
      ? { teacherId: account.uid, department: 'Mathematics', subject: 'Mathematics', yearsOfExperience: '1', qualification: 'QA Fixture', students: [] }
      : {
          studentId: account.uid,
          lrn: account.uid === IDs.studentA ? 'QA-LRN-0001' : 'QA-LRN-0002',
          grade: 'Grade 11', gradeLevel: 'Grade 11', section: 'QA-Risk', school: 'MathPulse QA',
          enrollmentDate: now.toISOString().slice(0, 10), major: 'STEM', gpa: '0.00', level: 1,
          currentXP: 0, totalXP: account.uid === IDs.studentB ? 250 : 0, streakShields: 1,
          atRiskSubjects: ['Mathematics'], hasTakenDiagnostic: false,
          teacherId: IDs.teacher, classroomId: IDs.classroom, classSectionId: IDs.section,
        }),
    ...extra,
  });

  const owned = (payload) => ({ ...payload, qaOwner: true, qaSeed: MARKER, updatedAt: timestamp.fromDate(now) });
  const docs = new Map();
  const add = (docPath, payload) => docs.set(docPath, owned(payload));
  const primaryMeta = {
    classSectionId: IDs.section, className: 'Grade 11 - QA Risk', grade: 'Grade 11', gradeLevel: 'Grade 11',
    section: 'QA-Risk', classification: 'STEM', strand: 'STEM', schoolYear: '2026-2027',
    ownerTeacherId: IDs.teacher, ownerTeacherName: 'QA Teacher Primary', adviserTeacherId: IDs.teacher,
    adviserTeacherName: 'QA Teacher Primary', managerId: IDs.teacher, managerName: 'QA Teacher Primary',
  };
  const privateMeta = {
    classSectionId: IDs.privateSection, className: 'Grade 11 - QA Private', grade: 'Grade 11', gradeLevel: 'Grade 11',
    section: 'QA-Private', classification: 'STEM', strand: 'STEM', schoolYear: '2026-2027',
    ownerTeacherId: IDs.teacher2, ownerTeacherName: 'QA Teacher Private', adviserTeacherId: IDs.teacher2,
    adviserTeacherName: 'QA Teacher Private', managerId: IDs.teacher2, managerName: 'QA Teacher Private',
  };

  for (const account of ACCOUNTS) add(`users/${account.uid}`, profile(account, account.role === 'student' ? { currentXP: account.uid === IDs.studentB ? 250 : 0, streakShields: 1 } : {}));
  add(`classrooms/${IDs.classroom}`, {
    id: IDs.classroom, name: primaryMeta.className, teacherId: IDs.teacher, ...primaryMeta,
    schedule: 'QA only', studentCount: 30, avgScore: 60, atRiskCount: 6, createdAt: timestamp.fromDate(now),
  });
  add(`classrooms/${IDs.privateClassroom}`, {
    id: IDs.privateClassroom, name: privateMeta.className, teacherId: IDs.teacher2, ...privateMeta,
    schedule: 'QA only', studentCount: 0, avgScore: 0, atRiskCount: 0, createdAt: timestamp.fromDate(now), visibility: 'private',
  });
  for (const meta of [primaryMeta, privateMeta]) {
    add(`classSectionOwnership/${meta.classSectionId}`, {
      id: meta.classSectionId, ...meta, studentUids: meta.classSectionId === IDs.section ? [IDs.studentA, IDs.studentB] : [],
      createdAt: timestamp.fromDate(now), updatedAt: timestamp.fromDate(now),
    });
  }

  const scores = [48, 68, 52, 55, 58, 62, 65, 70, 72, 74, 76, 78, 80, 82, 84, 86, 88, 90, 92, 54, 59, 63, 67, 71, 75, 79, 83, 87, 91, 45];
  const roster = [];
  for (let index = 0; index < 30; index += 1) {
    const ordinal = String(index + 1).padStart(2, '0');
    const uid = index === 0 ? IDs.studentA : index === 1 ? IDs.studentB : `qa_roster_${ordinal}`;
    const score = scores[index];
    const lrn = index === 29 ? 'QA-LRN-DUP-0001' : index === 0 ? 'QA-LRN-0001' : index === 1 ? 'QA-LRN-0002' : `QA-LRN-${String(index + 100).padStart(4, '0')}`;
    const topic = index === 29 || index === 0 ? 'rational-functions' : `qa-topic-${ordinal}`;
    const rosterEntry = {
      id: uid, uid, lrn, name: index === 0 ? 'QA Student A' : index === 1 ? 'QA Student B' : `QA Roster ${ordinal}`,
      email: index < 2 ? ACCOUNTS[index + 2].email : `qa.roster.${ordinal}@mathpulse.ai`, avatar: '',
      teacherId: IDs.teacher, classroomId: IDs.classroom, classSectionId: IDs.section, className: primaryMeta.className,
      grade: 'Grade 11', gradeLevel: 'Grade 11', section: 'QA-Risk', classification: 'STEM', strand: 'STEM',
      managerId: IDs.teacher, managerName: 'QA Teacher Primary', classMetadata: primaryMeta,
      riskLevel: score < 60 ? 'High' : score < 75 ? 'Medium' : 'Low', engagementScore: index === 0 ? 18 : 60,
      avgQuizScore: score, weakestTopic: topic === 'rational-functions' ? 'Rational Functions' : `QA Topic ${ordinal}`,
      attendance: index === 0 ? 52 : 94, assignmentCompletion: index === 1 ? 68 : 92,
      lastActive: index === 0 ? daysAgo(8) : daysAgo(1), struggles: topic === 'rational-functions' ? ['Rational Functions'] : [],
      hasRegisteredAccount: index < 2, source: index < 2 ? 'registered' : 'import',
      wri: score, riskStatus: score < 60 ? 'at_risk' : score < 68 ? 'critical' : 'watch',
      diagnosticScore: score, externalGradesAvg: score, systemPerformanceAvg: score,
      createdAt: timestamp.fromDate(now), updatedAt: timestamp.fromDate(now),
    };
    if (index < 2) rosterEntry.accountUid = uid;
    roster.push(rosterEntry);
    add(`managedStudents/${uid}`, rosterEntry);
    const quizId = topic === 'rational-functions' ? 'rational-functions-qa-evidence' : `qa-topic-${ordinal}-evidence`;
    const attempts = [{ quizId, attemptNumber: 1, score, completedAt: daysAgo(index === 0 ? 8 : 1), timeSpent: 600, answers: [] }];
    add(`progress/${uid}`, {
      userId: uid, subjects: {}, lessons: {
        qa_lesson_functions: { lessonId: 'qa_lesson_functions', progressPercent: 33, lastSectionIndex: 1, completed: false, timeSpent: 0 },
      }, quizAttempts: attempts, totalLessonsCompleted: 0, totalQuizzesCompleted: 1, averageScore: score,
      currentSection: 2, completedSections: 2, totalSections: 6, updatedAt: timestamp.fromDate(now),
    });
  }

  add(`users/${IDs.studentA}/dailyRewards/${IDs.studentA}`, {
    userId: IDs.studentA, lastClaimedDate: '', lastClaimedWeekSeed: 0, claimedDays: [], currentStreak: 4,
    longestStreak: 4, totalClaimed: 4, hintTokens: 0, streakShields: 1, activeMultiplier: null,
    createdAt: timestamp.fromDate(now), updatedAt: timestamp.fromDate(now),
  });

  const question = {
    id: 'qa_question_functions_01', questionType: 'multiple_choice', question: 'Evaluate f(2) when f(x)=2x+1.',
    options: ['3', '4', '5', '6'], correctAnswer: '5', bloomLevel: 'apply', difficulty: 'easy', topic: 'Functions',
    subject: 'Mathematics', points: 1, explanation: 'Substitute x=2.',
  };
  const genQuiz = (id, title, status) => ({
    id, title, gradeLevel: 'Grade 11', questions: [question], totalPoints: 1, teacherId: IDs.teacher,
    metadata: { topicsCovered: ['Functions'], difficultyBreakdown: { easy: 1, medium: 0, hard: 0 },
      bloomDistribution: { apply: 1 }, questionTypeBreakdown: { multiple_choice: 1 }, supplementalPurpose: 'QA prerequisite',
      recommendedTeacherActions: [], generatedAt: now.toISOString(), generatedBy: 'teacher_generated', assignedTo: 'QA-LRN-0001' },
    status, source: 'teacher_generated', createdAt: timestamp.fromDate(now),
  });
  add(`generatedQuizzes/${IDs.quiz}`, genQuiz(IDs.quiz, 'QA Functions Review', 'completed'));
  add(`generatedQuizzes/${IDs.diagnosticPrereqQuiz}`, genQuiz(IDs.diagnosticPrereqQuiz, 'QA Diagnostic Prerequisite', 'published'));
  add(`quizAssignments/${IDs.assignment}`, {
    quizId: IDs.quiz, lrn: 'QA-LRN-0001', teacherId: IDs.teacher, status: 'completed',
    assignedAt: daysAgo(2), dueDate: daysAgo(-5), completedAt: daysAgo(1), score: 100, qaOwner: true,
  });
  add(`quizSubmissions/${IDs.submission}`, {
    submissionId: IDs.submission, lrn: 'QA-LRN-0001', quizId: IDs.quiz, generatedQuizId: IDs.quiz,
    subject: 'Mathematics', source: 'ai_generated', score: 100, xpEarned: 10, totalTime: 60,
    answers: [{ questionId: question.id, answer: '5', correct: true, timeSpent: 30 }], correctCount: 1,
    totalQuestions: 1, questionBreakdown: [{ questionId: question.id, topic: 'Functions', difficulty: 'easy', bloomLevel: 'apply', correct: true, timeSpent: 30 }],
    submittedAt: timestamp.fromDate(now), qaOwner: true,
  });
  add(`practice_results/${IDs.studentA}/sessions/qa_practice_session_rational_functions`, {
    session_id: 'rational-functions-qa-evidence', userId: IDs.studentA, score_percent: 48, correct_count: 1,
    total: 2, xp_earned: 0, subject: 'Mathematics', competency: 'Rational Functions', difficulty: 'medium',
    answers: [], per_question_feedback: [{ topic: 'Rational Functions', is_correct: false }], submitted_at: now.toISOString(),
  });
  add(`practice_results/${IDs.studentB}/sessions/qa_practice_session_borderline`, {
    session_id: 'qa_functions-borderline', userId: IDs.studentB, score_percent: 68, correct_count: 2,
    total: 3, xp_earned: 0, subject: 'Mathematics', competency: 'Functions', difficulty: 'medium',
    answers: [], per_question_feedback: [], submitted_at: now.toISOString(),
  });
  add(`calendarEvents/${IDs.calendar}`, {
    id: IDs.calendar, userId: IDs.teacher, title: 'QA Calendar Navigation Prerequisite',
    description: 'QA-only prerequisite event; not a created-entity test fixture.', startTime: daysAgo(-1),
    endTime: daysAgo(-1), color: 'purple', createdAt: timestamp.fromDate(now), updatedAt: timestamp.fromDate(now),
  });
  add('aiUsageLogs/qa_sheet_scenarios_functions', {
    featureId: 'qa_functions', featureName: 'QA Functions Scenario', requestCount: 17,
    estimatedCostUSD: 0.17, priority: 'Medium', status: 'Healthy', month: now.toISOString().slice(0, 7),
    lastUpdated: timestamp.fromDate(now), qaTag: MARKER,
  });

  return { docs, roster, accountProfiles: new Map(ACCOUNTS.map((account) => [account.uid, profile(account)])) };
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'w' });
}

function isQAOwned(snapshot) {
  return snapshot.exists && snapshot.get('qaOwner') === true && snapshot.get('qaSeed') === MARKER;
}

async function checkAccountCollisions(auth, firestore) {
  const found = [];
  for (const account of ACCOUNTS) {
    try {
      const existing = await auth.getUser(account.uid);
      const customClaimsOwned = existing.customClaims?.qaSeed === MARKER;
      const profileSnapshot = await firestore.doc(`users/${account.uid}`).get();
      if (existing.email !== account.email || !customClaimsOwned || (profileSnapshot.exists && !isQAOwned(profileSnapshot))) {
        found.push({ uid: account.uid, reason: 'Auth UID/email/profile is not owned by this QA seeder' });
      }
    } catch (error) {
      if (error.code !== 'auth/user-not-found') throw error;
    }
    try {
      const byEmail = await auth.getUserByEmail(account.email);
      if (byEmail.uid !== account.uid) found.push({ uid: account.uid, reason: 'QA email is already attached to another Auth UID' });
    } catch (error) {
      if (error.code !== 'auth/user-not-found') throw error;
    }
  }
  return found;
}

async function getSecondarySnapshots(db) {
  const snapshots = new Map();
  for (const account of ACCOUNTS) {
    const querySnapshot = await db.collection(`notifications/${account.uid}/items`).get();
    for (const snapshot of querySnapshot.docs) snapshots.set(snapshot.ref.path, snapshot);
    const checkins = await db.collection(`tutorCheckins/${account.uid}/messages`).get();
    for (const snapshot of checkins.docs) snapshots.set(snapshot.ref.path, snapshot);
    const intervention = await db.doc(`interventionChecklists/${account.uid}`).get();
    if (intervention.exists) snapshots.set(intervention.ref.path, intervention);
    const leaderboard = await db.doc(`leaderboard/${account.uid}`).get();
    if (leaderboard.exists) snapshots.set(leaderboard.ref.path, leaderboard);
  }
  return snapshots;
}

async function main() {
  const { mode, target } = parseArgs(process.argv.slice(2));
  const serviceAccount = assertRuntimeKey();
  const modulePath = path.resolve(__dirname, '../functions/node_modules/firebase-admin');
  const admin = require(modulePath);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: target });
  const auth = admin.auth();
  const db = admin.firestore();
  const now = new Date();
  const { docs, roster } = makeFixtures(admin, now);
  const fixedSnapshots = new Map();
  const collisions = await checkAccountCollisions(auth, db);
  const perDocPlan = [];
  const authActions = new Map();
  for (const account of ACCOUNTS) {
    try {
      const existingAuth = await auth.getUser(account.uid);
      authActions.set(account.uid, 'reuse');
      perDocPlan.push({ path: `Auth/${account.uid}`, action: 'reuse', ownership: existingAuth.customClaims?.qaSeed === MARKER ? 'qa-owned' : 'collision' });
    } catch (error) {
      if (error.code !== 'auth/user-not-found') throw error;
      authActions.set(account.uid, 'create');
      perDocPlan.push({ path: `Auth/${account.uid}`, action: 'create', ownership: 'new' });
    }
  }
  for (const [docPath] of docs) {
    const snapshot = await db.doc(docPath).get();
    fixedSnapshots.set(docPath, snapshot);
    const safe = !snapshot.exists || isQAOwned(snapshot) || docPath.startsWith('notifications/') || docPath.startsWith('tutorCheckins/');
    if (!safe) collisions.push({ path: docPath, reason: 'Existing Firestore document is not QA-owned' });
    perDocPlan.push({ path: docPath, action: snapshot.exists ? 'update' : 'create', ownership: snapshot.exists ? (safe ? 'qa-owned' : 'collision') : 'new' });
  }
  const secondaryBefore = await getSecondarySnapshots(db);
  for (const [docPath, snapshot] of secondaryBefore) {
    perDocPlan.push({ path: docPath, action: 'trigger-owned-existing-backup', ownership: 'recipient-qa-uid' });
    fixedSnapshots.set(docPath, snapshot);
  }

  const plan = {
    createdAt: now.toISOString(), target, mode, fixtureCount: docs.size, rosterCount: roster.length,
    accounts: ACCOUNTS.map(({ uid, email, role }) => ({ uid, email, role })),
    plan: perDocPlan, collisions,
    excluded: ['diagnosticResults/**', 'auditLogs writes', 'activityScores', 'externalGrades', 'STU-014 lock claim'],
    riskRecalc: 'No activityScores/externalGrades writes; riskTriggers recalc will not be invoked by this seed.',
  };
  const dryRunLog = path.join(DEEPWORK, 'qa-seed-dry-run.json');
  if (mode === 'dry-run') writeJson(dryRunLog, plan);
  console.log(`MODE ${mode.toUpperCase()} | TARGET ${target} | FIXTURES ${docs.size} | ROSTER ${roster.length}`);
  for (const entry of perDocPlan) console.log(`${entry.action.toUpperCase()} ${entry.path}${entry.ownership === 'collision' ? ' COLLISION' : ''}`);
  if (collisions.length) throw new Error(`Refusing to proceed: ${collisions.length} collision(s); see ${path.relative(ROOT, dryRunLog)}.`);
  if (mode === 'dry-run') {
    console.log(`DRY RUN complete. Plan: ${path.relative(ROOT, dryRunLog)}`);
    return;
  }

  if (!fs.existsSync(PLAN_PATH)) throw new Error('Run --dry-run successfully before --apply.');
  const priorPlan = JSON.parse(fs.readFileSync(PLAN_PATH, 'utf8'));
  if (priorPlan.mode !== 'dry-run') throw new Error('The recorded plan is not a successful dry-run; rerun --dry-run first.');
  const plannedPaths = priorPlan.plan.map((entry) => entry.path).sort();
  const currentPaths = perDocPlan.map((entry) => entry.path).sort();
  if (priorPlan.target !== target || plannedPaths.length !== currentPaths.length || plannedPaths.some((docPath, index) => docPath !== currentPaths[index])) {
    throw new Error('Current live plan differs from the reviewed dry-run path list; rerun --dry-run.');
  }
  let priorCredentials = { accounts: {} };
  if (fs.existsSync(CREDENTIALS_PATH)) priorCredentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  for (const account of ACCOUNTS) {
    try {
      await auth.getUser(account.uid);
      if (!priorCredentials.accounts?.[account.uid]?.password) {
        throw new Error(`Existing QA Auth account ${account.uid} has no locally recorded credential; refusing password mutation.`);
      }
    } catch (error) {
      if (error.code !== 'auth/user-not-found') throw error;
    }
  }

  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(DEEPWORK, `qa-seed-backup-${stamp}.json`);
  const backupDocs = [];
  for (const [docPath, snapshot] of fixedSnapshots) {
    backupDocs.push({ path: docPath, exists: snapshot.exists, owner: snapshot.exists ? (snapshot.get('qaOwner') === true ? 'qa' : 'recipient-qa-trigger') : null, data: snapshot.exists ? JSON.parse(JSON.stringify(snapshot.data())) : null });
  }
  writeJson(backupPath, { createdAt: now.toISOString(), target, documents: backupDocs });
  if (!fs.existsSync(ORIGIN_PATH)) {
    const backups = fs.readdirSync(DEEPWORK)
      .filter((name) => name.startsWith('qa-seed-backup-') && name.endsWith('.json'))
      .sort();
    const firstBackupPath = backups.length ? path.join(DEEPWORK, backups[0]) : backupPath;
    const firstBackup = JSON.parse(fs.readFileSync(firstBackupPath, 'utf8'));
    const missingAtOrigin = firstBackup.documents.filter((entry) => !entry.exists).map((entry) => entry.path);
    const credentialsAtOrigin = fs.existsSync(CREDENTIALS_PATH)
      ? JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'))
      : { accounts: {} };
    const createdAuthUids = ACCOUNTS.filter(({ uid }) => Boolean(credentialsAtOrigin.accounts?.[uid])).map(({ uid }) => uid);
    writeJson(ORIGIN_PATH, {
      target,
      baselineBackup: path.relative(ROOT, firstBackupPath),
      baselineCreatedAt: firstBackup.createdAt,
      createdFirestorePaths: missingAtOrigin,
      createdAuthUids,
    });
  }
  const diagnosticsBefore = await db.collection('diagnosticResults').where('lrn', 'in', ['QA-LRN-0001', 'QA-LRN-0002']).get();
  const diagnosticIdsBefore = new Set(diagnosticsBefore.docs.map((snapshot) => snapshot.id));

  const credentials = { ...priorCredentials.accounts };
  for (const account of ACCOUNTS) {
    try {
      const existingAuth = await auth.getUser(account.uid);
      if (existingAuth.customClaims?.qaSeed !== MARKER) throw new Error(`Auth account ${account.uid} lost QA ownership; refusing changes.`);
      credentials[account.uid] = { email: account.email, password: priorCredentials.accounts[account.uid].password };
    } catch (error) {
      if (error.code !== 'auth/user-not-found') throw error;
      const password = `${crypto.randomBytes(24).toString('base64url')}!Aa9`;
      await auth.createUser({ uid: account.uid, email: account.email, password, displayName: account.name, emailVerified: true, disabled: false });
      await auth.setCustomUserClaims(account.uid, { qaSeed: MARKER });
      credentials[account.uid] = { email: account.email, password };
      writeJson(CREDENTIALS_PATH, { createdAt: now.toISOString(), target, accounts: credentials });
    }
  }
  writeJson(CREDENTIALS_PATH, { createdAt: priorCredentials.createdAt || now.toISOString(), target, accounts: credentials });

  const profileDocs = [...docs.entries()].filter(([docPath]) => docPath.startsWith('users/'));
  for (const [docPath, data] of profileDocs) {
    const snapshot = fixedSnapshots.get(docPath);
    if (snapshot?.exists) await db.doc(docPath).set(data, { merge: true });
    else await db.doc(docPath).create(data);
  }

  for (const account of ACCOUNTS.filter(({ role }) => role === 'student')) {
    const progressRef = db.doc(`progress/${account.uid}`);
    const deadline = Date.now() + 90000;
    let triggerInitialized = false;
    while (Date.now() < deadline) {
      const triggerProgress = await progressRef.get();
      const notifications = await db.collection(`notifications/${account.uid}/items`).get();
      if (triggerProgress.exists && notifications.size > 0) {
        triggerInitialized = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    if (!triggerInitialized) throw new Error(`onStudentCreated secondary writes were not observed for ${account.uid}; stop for manual reconciliation.`);
  }

  for (const [docPath, data] of docs) {
    if (docPath.startsWith('users/')) continue;
    const snapshot = fixedSnapshots.get(docPath);
    const liveSnapshot = snapshot?.exists ? snapshot : await db.doc(docPath).get();
    if (liveSnapshot.exists) {
      const triggerProgress = docPath.startsWith('progress/qa_student_') && !snapshot?.exists;
      if (!triggerProgress && !isQAOwned(liveSnapshot)) throw new Error(`Unexpected non-QA document appeared at ${docPath}; refusing overwrite.`);
      await db.doc(docPath).set(data, { merge: true });
    } else {
      await db.doc(docPath).create(data);
    }
  }

  const afterSnapshots = await getSecondarySnapshots(db);
  const origin = JSON.parse(fs.readFileSync(ORIGIN_PATH, 'utf8'));
  const triggerSecondaries = [];
  for (const account of ACCOUNTS.filter(({ role }) => role === 'student')) {
    const progressPath = `progress/${account.uid}`;
    const progressSnapshot = await db.doc(progressPath).get();
    if (progressSnapshot.exists) {
      const createdAtOrigin = origin.createdFirestorePaths.includes(progressPath);
      triggerSecondaries.push({ path: progressPath, kind: createdAtOrigin ? 'onStudentCreated-progress-init' : 'pre-existing-progress', exists: true });
    }
  }
  for (const [docPath, snapshot] of afterSnapshots) {
    const createdAtOrigin = snapshot.createTime.toDate().getTime() >= new Date(origin.baselineCreatedAt).getTime();
    const triggerKind = docPath.startsWith('notifications/') && createdAtOrigin
      ? 'onStudentCreated-notification'
      : createdAtOrigin
        ? 'QA-trigger-secondary'
        : 'pre-existing-qa-recipient-trigger-doc';
    triggerSecondaries.push({ path: docPath, kind: triggerKind, exists: snapshot.exists });
  }
  const finalReads = [];
  for (const docPath of docs.keys()) {
    const snapshot = await db.doc(docPath).get();
    if (!snapshot.exists || snapshot.get('qaSeed') !== MARKER) throw new Error(`Post-write verification failed for ${docPath}.`);
    finalReads.push({ path: docPath, exists: true, qaOwned: true });
  }
  const diagnosticsAfter = await db.collection('diagnosticResults').where('lrn', 'in', ['QA-LRN-0001', 'QA-LRN-0002']).get();
  const diagnosticIdsAfter = new Set(diagnosticsAfter.docs.map((snapshot) => snapshot.id));
  const newDiagnosticIds = [...diagnosticIdsAfter].filter((id) => !diagnosticIdsBefore.has(id));
  if (newDiagnosticIds.length) throw new Error('Unexpected diagnosticResults appeared during seed; seeder does not write this collection. Investigate trigger/user activity.');
  const auditRead = await db.collection('auditLogs').where('qaSeed', '==', MARKER).limit(10).get();
  const riskInputs = await Promise.all(roster.map((student) => db.collection(`managedStudents/${student.id}/activityScores`).get()));
  if (riskInputs.some((snapshot) => !snapshot.empty)) throw new Error('Unexpected QA activityScores found; risk recalculation may have run.');
  const rosterRead = await db.collection('managedStudents').where('classroomId', '==', IDs.classroom).get();
  if (rosterRead.size !== 30) throw new Error(`Expected 30 QA roster docs; found ${rosterRead.size}.`);
  const studentAProgress = await db.doc(`progress/${IDs.studentA}`).get();
  const studentBAssignment = await db.doc(`quizAssignments/${IDs.assignment}`).get();
  const completedSubmission = await db.doc(`quizSubmissions/${IDs.submission}`).get();
  const privateSectionRead = await db.doc(`classSectionOwnership/${IDs.privateSection}`).get();
  if (studentAProgress.get('currentSection') !== 2 || studentAProgress.get('totalSections') !== 6 || studentAProgress.get('completedSections') !== 2) {
    throw new Error('Student progress section resume fixture did not verify as current section 2 and 2/6 complete.');
  }
  if (studentBAssignment.get('status') !== 'completed' || !completedSubmission.exists || privateSectionRead.get('ownerTeacherId') !== IDs.teacher2) {
    throw new Error('Quiz submission or private section fixture did not verify.');
  }
  const studentBUser = await db.doc(`users/${IDs.studentB}`).get();
  if (studentBUser.get('totalXP') !== 250) {
    throw new Error('Student B XP fixture did not verify as 250 (onStudentCreated may have reset it after the fixture write).');
  }
  const qaStudentsPrefix = [`progress/${IDs.studentA}`, `progress/${IDs.studentB}`];
  if (triggerSecondaries.some((entry) => !qaStudentsPrefix.includes(entry.path) && !entry.path.startsWith('notifications/qa_') && !entry.path.startsWith('tutorCheckins/qa_') && !entry.path.startsWith('interventionChecklists/qa_') && !entry.path.startsWith('leaderboard/qa_'))) {
    throw new Error('Unexpected non-QA trigger secondary path observed.');
  }

  const manifest = {
    createdAt: new Date().toISOString(), target, marker: MARKER,
    authUids: ACCOUNTS.map(({ uid, email, role }) => ({ uid, email, role, path: `Auth/${uid}`, action: authActions.get(uid) })),
    firestorePaths: [...docs.keys()],
    origin: { baselineBackup: origin.baselineBackup },
    createdPaths: origin.createdFirestorePaths,
    updatedPaths: [...docs.keys()].filter((docPath) => !origin.createdFirestorePaths.includes(docPath)),
    createdAuthUids: origin.createdAuthUids,
    createdUniqueFirestorePaths: [...new Set([...origin.createdFirestorePaths, ...triggerSecondaries.map((entry) => entry.path)])],
    counts: {
      createdFixturePaths: origin.createdFirestorePaths.length,
      createdAdditionalTriggerPaths: triggerSecondaries.filter((entry) => !origin.createdFirestorePaths.includes(entry.path) && entry.kind !== 'pre-existing-qa-recipient-trigger-doc').length,
      createdAuthUids: origin.createdAuthUids.length,
    },
    triggerSecondaries,
    riskRecalc: { triggeredBySeeder: false, reason: 'No activityScores/externalGrades writes.', checkedQaActivityScoreDocs: riskInputs.length },
    verification: {
      verificationComplete: true, deterministicDocumentCount: finalReads.length, rosterCount: roster.length,
      groups: {
        student: { userAndProgressReads: finalReads.filter((entry) => entry.path.startsWith('users/qa_student') || entry.path.startsWith('progress/qa_student')).length, progressSection: 'currentSection=2, completedSections=2, totalSections=6', practiceSessions: 2, quizAssignmentCompleted: studentBAssignment.get('status') === 'completed', completedSubmission: completedSubmission.exists, generatedQuiz: true, streakShield: true },
        teacher: { accountAndClasses: true, rosterCount: rosterRead.size, highRiskScore48: rosterRead.docs.some((snapshot) => snapshot.get('avgQuizScore') === 48), borderlineScore68: rosterRead.docs.some((snapshot) => snapshot.get('avgQuizScore') === 68), inactiveDays8: rosterRead.docs.some((snapshot) => snapshot.id === IDs.studentA && Math.floor((now.getTime() - snapshot.get('lastActive').toDate().getTime()) / 86400000) === 8), secondTeacherPrivateSection: privateSectionRead.get('ownerTeacherId') === IDs.teacher2, calendarPrerequisite: true },
        admin: { aiUsageLog: true, auditLogsReadOnlyCount: auditRead.size },
      },
      diagnosticResultsCreated: false,
      diagnosticResultsReadOnlyCheck: { beforeCount: diagnosticIdsBefore.size, afterCount: diagnosticIdsAfter.size, newDocuments: newDiagnosticIds.length },
      nonQAPathsWrittenBySeeder: 0,
      nonQARecordsModified: false,
      collisionCount: collisions.length,
    },
    manualQA: [
      { cases: ['TC-STU-004'], steps: ['Sign in as qa.student.a@mathpulse.ai.', 'Create a diagnostic result through the product diagnostic flow.', 'Open diagnostic history and verify the new attempt appears.'] },
      { cases: ['TC-STU-005'], steps: ['Sign in as qa.student.a@mathpulse.ai.', 'Complete the product diagnostic flow with a score below 75%.', 'Verify benchmark/tracking reflects the completed result.'] },
      { cases: ['TC-STU-006', 'TC-STU-007'], steps: ['Sign in as qa.student.a@mathpulse.ai.', 'Complete a diagnostic with Functions below 60%.', 'Verify the Functions gap/recommendation flow; do not treat seeded prerequisites as diagnostic evidence.'] },
      { cases: ['TC-STU-008'], steps: ['Sign in as qa.student.a@mathpulse.ai.', 'Complete a diagnostic that marks the target topic as weak.', 'Clear the topic tag using the product flow and verify it is removed.'] },
    ],
    backupPath: path.relative(ROOT, backupPath), dryRunPath: path.relative(ROOT, dryRunLog),
    credentialsPath: path.relative(ROOT, CREDENTIALS_PATH), manualQaPath: path.relative(ROOT, MANUAL_QA_PATH),
  };
  writeJson(MANIFEST_PATH, manifest);
  const manualQa = manifest.manualQA.map((entry) => `## ${entry.cases.join(', ')}\n\n${entry.steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}\n`).join('\n');
  fs.writeFileSync(MANUAL_QA_PATH, `# MANUAL-QA — Diagnostic-dependent scenarios\n\nThe seeder intentionally does not create diagnosticResults. Run each flow in the product using the listed QA account.\n\n${manualQa}`, 'utf8');
  console.log(`APPLY complete | verified=${finalReads.length} | triggerSecondaries=${triggerSecondaries.length} | manifest=${path.relative(ROOT, MANIFEST_PATH)}`);
  console.log(`VERIFICATION ${JSON.stringify(manifest.verification)}`);
}

main().catch((error) => {
  console.error(`SEED_REFUSED_OR_FAILED ${error.message}`);
  process.exitCode = 1;
});
