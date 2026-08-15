import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("Firestore push-related rules remain deny-by-default and owner scoped", () => {
  const rules = readFileSync(resolve(__dirname, "../../firestore.rules"), "utf8");
  assert.match(rules, /match \/users\/\{userId\}\/fcmTokens\/\{tokenId\}/);
  assert.match(rules, /request\.resource\.data\.userId == userId/);
  assert.match(rules, /request\.resource\.data\.token == resource\.data\.token/);
  assert.match(rules, /match \/_pushDeliveries\/\{deliveryId\}/);
  assert.match(rules, /match \/notifications\/\{userId\}\/items\/\{notificationId\}/);
  assert.match(rules, /allow create: if isSelf\(userId\);/);
  assert.match(rules, /match \/assessmentResults\/\{studentId\}\/attempts\/\{attemptId\}/);
  assert.match(rules, /allow create, update: if request\.auth != null && request\.auth\.uid == studentId;/);
});
