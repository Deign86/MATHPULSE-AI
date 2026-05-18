import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';

const serviceAccount = path.resolve(__dirname, '../.secrets/firebase-service-account.json');
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function main() {
  // Sync studentCount from classSectionOwnership.studentUids length
  const ownershipSnap = await db.collection('classSectionOwnership').get();
  for (const doc of ownershipSnap.docs) {
    const studentUids = doc.data().studentUids || [];
    const classroomRef = db.doc(`classrooms/${doc.id}`);
    const classroomSnap = await classroomRef.get();
    if (classroomSnap.exists) {
      await classroomRef.update({ studentCount: studentUids.length });
      console.log(`${doc.id}: studentCount → ${studentUids.length}`);
    }
  }
}

main().catch(console.error);
