const { initializeApp, cert, getApps, getApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

function initializeAdmin() {
  if (getApps().length > 0) return getApp();

  let serviceAccount;
  const secretsPath = path.resolve(__dirname, '../.secrets/firebase-service-account.json');

  if (fs.existsSync(secretsPath)) {
    console.log('Found service account at .secrets/firebase-service-account.json');
    serviceAccount = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } else {
    throw new Error('No Firebase service account found in .secrets/ or env vars.');
  }

  return initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id || 'mathpulse-ai-2026',
  });
}

const app = initializeAdmin();
const db = getFirestore(app);

const FEATURES = [
  { id: 'ai_chat_tutor', name: 'AI Chat Tutor', priority: 'High', status: 'Healthy', baseReq: 1500, baseCost: 25.5 },
  { id: 'rag_lesson_gen', name: 'RAG Lesson Generation', priority: 'High', status: 'Healthy', baseReq: 350, baseCost: 12.2 },
  { id: 'diagnostic_eval', name: 'Diagnostic Evaluation', priority: 'High', status: 'Healthy', baseReq: 120, baseCost: 5.0 },
  { id: 'quiz_generation', name: 'Quiz Generation', priority: 'Medium', status: 'Healthy', baseReq: 850, baseCost: 8.5 },
  { id: 'flashcard_gen', name: 'Flashcard Generation', priority: 'Medium', status: 'Healthy', baseReq: 420, baseCost: 4.2 },
  { id: 'concept_explain', name: 'Concept Explanation', priority: 'Medium', status: 'Degraded', baseReq: 930, baseCost: 10.1 },
  { id: 'hint_generation', name: 'Hint Generation', priority: 'Medium', status: 'Healthy', baseReq: 2100, baseCost: 18.0 },
  { id: 'avatar_persona', name: 'Avatar Persona Gen', priority: 'Low', status: 'Healthy', baseReq: 50, baseCost: 0.5 },
  { id: 'study_plan_gen', name: 'Study Plan Generation', priority: 'Low', status: 'Healthy', baseReq: 85, baseCost: 2.1 },
  { id: 'yt_query_gen', name: 'YouTube Query Gen', priority: 'Low', status: 'Healthy', baseReq: 640, baseCost: 3.2 },
];

async function seed() {
  console.log('Seeding AI Usage data...');
  const targetMonth = new Date().toISOString().slice(0, 7); // current month e.g., "2026-05"
  
  const batch = db.batch();
  
  for (const feature of FEATURES) {
    // Add some randomness
    const variance = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2
    const requestCount = Math.floor(feature.baseReq * variance);
    const estimatedCostUSD = Number((feature.baseCost * variance).toFixed(2));
    
    const docId = `${targetMonth}_${feature.id}`;
    const docRef = db.collection('aiUsageLogs').doc(docId);
    
    batch.set(docRef, {
      featureId: feature.id,
      featureName: feature.name,
      requestCount,
      estimatedCostUSD,
      priority: feature.priority,
      status: feature.status,
      month: targetMonth,
      lastUpdated: FieldValue.serverTimestamp()
    }, { merge: true });
    
    console.log(`Prepared doc: ${docId} (${requestCount} reqs, $${estimatedCostUSD})`);
  }
  
  await batch.commit();
  console.log('✅ AI Usage seeding complete!');
}

seed()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
