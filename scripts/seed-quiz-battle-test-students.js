'use strict';

const path = require('path');
const fs = require('fs');

let admin;
try {
  admin = require(path.resolve(__dirname, '../functions/node_modules/firebase-admin'));
} catch {
  try {
    admin = require('firebase-admin');
  } catch {
    console.error(
      'Unable to load firebase-admin. Install dependencies in either the functions directory or the project root (for example: "cd functions && npm install" or "npm install firebase-admin").'
    );
    process.exit(1);
  }
}

const KEY_PATH = path.resolve(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(KEY_PATH)) {
  console.error('Missing scripts/serviceAccountKey.json');
  process.exit(1);
}

const serviceAccount = require(KEY_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const db = admin.firestore();

const runTag = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
const password = 'QuizBattle@2026';

const accounts = [
  {
    email: `qb.student.a.${runTag}@mathpulse.ai`,
    displayName: `QB Student A ${runTag.slice(-4)}`,
  },
  {
    email: `qb.student.b.${runTag}@mathpulse.ai`,
    displayName: `QB Student B ${runTag.slice(-4)}`,
  },
];

const baseStudentProfile = {
  role: 'student',
  grade: 'Grade 11',
  school: 'MathPulse Academy',
  enrollmentDate: new Date().toISOString().split('T')[0],
  major: 'STEM',
  gpa: '0.00',
  level: 1,
  currentXP: 0,
  totalXP: 0,
  streak: 0,
  atRiskSubjects: [],
  hasTakenDiagnostic: false,
};

async function upsert(account, index) {
  let uid;
  try {
    const existing = await auth.getUserByEmail(account.email);
    uid = existing.uid;
    await auth.updateUser(uid, {
      displayName: account.displayName,
      password,
    });
    console.log(`UPDATED_AUTH ${account.email} ${uid}`);
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err;
    const created = await auth.createUser({
      email: account.email,
      password,
      displayName: account.displayName,
    });
    uid = created.uid;
    console.log(`CREATED_AUTH ${account.email} ${uid}`);
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const profile = {
    uid,
    email: account.email,
    name: account.displayName,
    photo: '',
    updatedAt: now,
    ...baseStudentProfile,
    studentId: `STU-QB-${runTag}-${String(index + 1).padStart(2, '0')}`,
    section: 'STEM A',
  };

  const docRef = db.collection('users').doc(uid);
  const existingDoc = await docRef.get();
  if (existingDoc.exists) {
    await docRef.update(profile);
    console.log(`UPDATED_FIRESTORE ${account.email}`);
  } else {
    await docRef.set({ ...profile, createdAt: now });
    console.log(`CREATED_FIRESTORE ${account.email}`);
  }

  return {
    email: account.email,
    password,
    uid,
  };
}

(async () => {
  console.log(`PROJECT ${serviceAccount.project_id}`);
  const seeded = [];
  for (let i = 0; i < accounts.length; i += 1) {
    seeded.push(await upsert(accounts[i], i));
  }

  console.log('SEED_COMPLETE');
  for (const account of seeded) {
    console.log(`ACCOUNT ${account.email} ${account.password} ${account.uid}`);
  }
  process.exit(0);
})().catch((err) => {
  console.error('SEED_FAILED', err.message);
  process.exit(1);
});
