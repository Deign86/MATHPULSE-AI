import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("student creation ignores staff and initializes the student profile before notifying", () => {
  const triggerSource = readFileSync(resolve(__dirname, "../../src/triggers/onStudentCreated.ts"), "utf8");
  assert.match(triggerSource, /if \(userData\.role !== "student"\) \{[\s\S]*?return null;/);
  assert.match(triggerSource, /await batch\.commit\(\);[\s\S]*?await createNotification\(\{/);
  assert.match(triggerSource, /onboardingComplete: false/);
});
