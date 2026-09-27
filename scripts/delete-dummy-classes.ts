// One-time script: Delete ACAD and "Grade 11 - Section A" from classrooms collection
// Run: npx tsx scripts/delete-dummy-classes.ts

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';

const serviceAccount = path.resolve(__dirname, '../.secrets/firebase-service-account.json');
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function main() {
  const snap = await db.collection('classrooms').get();
  const toDelete = snap.docs.filter(d => {
    const name = d.data().name;
    return name === 'ACAD' || name === 'Grade 11 - Section A';
  });

  for (const doc of toDelete) {
    console.log(`Deleting: ${doc.data().name} (${doc.id})`);
    await doc.ref.delete();
  }
  console.log(`Done. Deleted ${toDelete.length} documents.`);
}

main().catch(console.error);
