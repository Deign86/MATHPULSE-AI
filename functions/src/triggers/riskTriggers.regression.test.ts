import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("WRI recalculation retains diagnostic fallback and weighted source averages", () => {
  const riskTriggerSource = readFileSync(resolve(__dirname, "../../../src/utils/riskEngine.ts"), "utf8");
  assert.match(riskTriggerSource, /const gVal = g \?\? d;/);
  assert.match(riskTriggerSource, /const pVal = p \?\? d;/);
  assert.match(riskTriggerSource, /weights\.w1 \* d \+ weights\.w2 \* gVal \+ weights\.w3 \* pVal/);
  assert.match(riskTriggerSource, /if \(wri >= 68\) return 'critical';/);
});
