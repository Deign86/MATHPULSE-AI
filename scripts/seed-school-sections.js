'use strict';
/* eslint-disable @typescript-eslint/no-var-requires -- This seed script runs directly with Node.js CommonJS. */

const fs = require('node:fs');
const path = require('node:path');

let admin;
try {
  admin = require(path.resolve(__dirname, '../functions/node_modules/firebase-admin'));
} catch {
  try {
    admin = require('firebase-admin');
  } catch {
    console.error('firebase-admin not found. Install dependencies in functions/ or the project root.');
    process.exit(1);
  }
}

const credentialsPath = process.env.FIREBASE_SERVICE_ACCOUNT_FILE
  || path.resolve(__dirname, '../.secrets/firebase-service-account.json');
if (!fs.existsSync(credentialsPath)) {
  console.error(`Firebase service account not found at ${credentialsPath}`);
  process.exit(1);
}

const serviceAccount = require(path.resolve(credentialsPath));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id || 'mathpulse-ai-2026',
});

const options = [
  { id: 'section_amaury', name: 'Aumaury', type: 'section', grade: 'Grade 11' },
  { id: 'section_edison', name: 'Edison', type: 'section', grade: 'Grade 11' },
  { id: 'section_einstein', name: 'Einstein', type: 'section', grade: 'Grade 11' },
  { id: 'section_mpai', name: 'Mpai', type: 'section', grade: 'Grade 11' },
  { id: 'track_academic', name: 'Academic', type: 'track' },
  { id: 'track_tech-pro', name: 'TechPro', type: 'track' },
];

async function seed() {
  const db = admin.firestore();
  const batch = db.batch();
  for (const option of options) {
    const { id, ...fields } = option;
    batch.set(db.collection('schoolSections').doc(id), fields);
  }
  await batch.commit();
  console.log(`Seeded ${options.length} registration options in ${serviceAccount.project_id || 'mathpulse-ai-2026'}.`);
}

seed().catch((error) => {
  console.error('Failed to seed registration options:', error.message);
  process.exitCode = 1;
});
