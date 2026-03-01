/**
 * MathPulse AI — Firebase Account Seeder
 * ─────────────────────────────────────────────────────────────────────────────
 * Seeds real test accounts into Firebase Auth + Firestore so developers can
 * start feature testing with proper role-based accounts.
 *
 * Prerequisites:
 *   1. Download a Firebase service account key from:
 *      Firebase Console → Project Settings → Service Accounts → Generate new private key
 *   2. Save the JSON file as:  scripts/serviceAccountKey.json
 *      (This file is .gitignored — never commit it)
 *
 * Usage (run from project root):
 *   node scripts/seed-users.js
 *
 * Or from functions/ directory (uses firebase-admin already installed there):
 *   cd functions && node ../scripts/seed-users.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const path = require('path');
const fs   = require('fs');

// ── Resolve firebase-admin from functions/node_modules or global install ──────
let admin;
try {
  admin = require(path.resolve(__dirname, '../functions/node_modules/firebase-admin'));
} catch {
  try {
    admin = require('firebase-admin');
  } catch {
    console.error(
      '\n❌  firebase-admin not found.\n' +
      '    Install dependencies in functions/ directory:\n' +
      '      cd functions && npm install\n' +
      '    Then re-run: node scripts/seed-users.js\n'
    );
    process.exit(1);
  }
}

// ── Load service account key ──────────────────────────────────────────────────
const KEY_PATH = path.resolve(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(KEY_PATH)) {
  console.error(
    '\n❌  Service account key not found at: scripts/serviceAccountKey.json\n' +
    '    Download it from Firebase Console:\n' +
    '      Project Settings → Service Accounts → Generate new private key\n'
  );
  process.exit(1);
}

const serviceAccount = require(KEY_PATH);

// ── Initialise Firebase Admin ──────────────────────────────────────────────────
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const db   = admin.firestore();

// ── Seed accounts definition ──────────────────────────────────────────────────
const SEED_ACCOUNTS = [
  {
    email:       'student@mathpulse.ai',
    password:    'Student@123456',
    displayName: 'Sample Student',
    role:        'student',
    profile: {
      studentId:        `STU-SEED-001`,
      grade:            'Grade 11',
      school:           'MathPulse Academy',
      enrollmentDate:   new Date().toISOString().split('T')[0],
      major:            'STEM',
      gpa:              '0.00',
      level:            1,
      currentXP:        0,
      totalXP:          0,
      streak:           0,
      friends:          [],
      atRiskSubjects:   [],
      hasTakenDiagnostic: false,
    },
  },
  {
    email:       'teacher@mathpulse.ai',
    password:    'Teacher@123456',
    displayName: 'Sample Teacher',
    role:        'teacher',
    profile: {
      teacherId:          `TCH-SEED-001`,
      department:         'Mathematics',
      subject:            'Mathematics',
      yearsOfExperience:  '1',
      qualification:      'B.Sc. Mathematics',
      students:           [],
    },
  },
  {
    email:       'admin@mathpulse.ai',
    password:    'Admin@123456',
    displayName: 'System Administrator',
    role:        'admin',
    profile: {
      adminId:    `ADM-SEED-001`,
      position:   'Administrator',
      department: 'System',
    },
  },
];

// ── Helper: upsert auth user ───────────────────────────────────────────────────
async function upsertAuthUser(account) {
  let uid;
  try {
    const existing = await auth.getUserByEmail(account.email);
    uid = existing.uid;
    await auth.updateUser(uid, {
      displayName: account.displayName,
      password:    account.password,
    });
    console.log(`  ✓  Updated   ${account.email}  (uid: ${uid})`);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      const created = await auth.createUser({
        email:       account.email,
        password:    account.password,
        displayName: account.displayName,
      });
      uid = created.uid;
      console.log(`  ✓  Created   ${account.email}  (uid: ${uid})`);
    } else {
      throw err;
    }
  }
  return uid;
}

// ── Helper: upsert Firestore profile ─────────────────────────────────────────
async function upsertFirestoreProfile(uid, account) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const docRef = db.collection('users').doc(uid);
  const existing = await docRef.get();

  const baseFields = {
    uid,
    email: account.email,
    name:  account.displayName,
    role:  account.role,
    photo: '',
    updatedAt: now,
  };

  if (existing.exists) {
    await docRef.update({ ...baseFields, ...account.profile });
    console.log(`  ✓  Updated   Firestore profile for ${account.email}`);
  } else {
    await docRef.set({ ...baseFields, ...account.profile, createdAt: now });
    console.log(`  ✓  Created   Firestore profile for ${account.email}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🌱  MathPulse AI — Seeding Firebase Accounts\n');
  console.log(`    Project: ${serviceAccount.project_id}\n`);

  for (const account of SEED_ACCOUNTS) {
    console.log(`\n  [${account.role.toUpperCase()}] ${account.email}`);
    try {
      const uid = await upsertAuthUser(account);
      await upsertFirestoreProfile(uid, account);
    } catch (err) {
      console.error(`  ✗  Error for ${account.email}: ${err.message}`);
    }
  }

  console.log('\n✅  Seeding complete!\n');
  console.log('   Credentials (change passwords after first login):');
  console.log('   ┌─────────────────────────────────────────────────────────────┐');
  for (const a of SEED_ACCOUNTS) {
    console.log(`   │  ${a.role.padEnd(8)} │ ${a.email.padEnd(28)} │ ${a.password}  │`);
  }
  console.log('   └─────────────────────────────────────────────────────────────┘\n');

  process.exit(0);
}

main().catch(err => {
  console.error('\n❌  Fatal error:', err.message);
  process.exit(1);
});
