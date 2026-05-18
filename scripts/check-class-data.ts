import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';

const serviceAccount = path.resolve(__dirname, '../.secrets/firebase-service-account.json');
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function main() {
  // Clear cached diagnostic analysis for all users so it regenerates with improved prompt
  const cacheSnap = await db.collectionGroup('cache').get();
  for (const doc of cacheSnap.docs) {
    if (doc.id === 'analysis' && doc.ref.parent.parent?.parent.id === 'diagnosticResults') {
      await doc.ref.delete();
      console.log(`Cleared cache: ${doc.ref.path}`);
    }
  }
  console.log('Done.');
}

main().catch(console.error);
