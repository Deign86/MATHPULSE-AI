/**
 * Migration script to populate leaderboard collection from users collection
 * Run: node migrate-leaderboard.js
 */

const admin = require("firebase-admin");
const path = require("path");

// Initialize Firebase Admin
const serviceAccount = require("../../.secrets/firebase-service-account.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

async function migrate() {
  console.log("Starting leaderboard migration...");

  const batch = db.batch();
  let count = 0;

  const usersSnapshot = await db
    .collection("users")
    .where("role", "==", "student")
    .get();

  console.log(`Found ${usersSnapshot.size} students to migrate`);

  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();
    const leaderboardRef = db.collection("leaderboard").doc(userDoc.id);

    batch.set(leaderboardRef, {
      name: userData.name || "Unknown",
      photo: userData.photo || "",
      totalXP: userData.totalXP || 0,
      level: userData.level || 1,
      weeklyXP: userData.weeklyXP || 0,
      monthlyXP: userData.monthlyXP || 0,
      role: userData.role,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    count++;

    // Commit in batches of 500
    if (count % 500 === 0) {
      await batch.commit();
      console.log(`Migrated ${count} users...`);
    }
  }

  // Final commit
  if (count % 500 !== 0) {
    await batch.commit();
  }

  console.log(`Migration complete! Migrated ${count} students to leaderboard collection`);

  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});