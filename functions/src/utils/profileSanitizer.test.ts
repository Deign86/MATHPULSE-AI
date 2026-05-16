import { test } from "node:test";
import * as assert from "node:assert/strict";
import {
  sanitizeName,
  sanitizePhone,
  sanitizeProfileFields,
} from "./profileSanitizer";

test("sanitizeName strips < and > characters", () => {
  assert.equal(sanitizeName('<script>alert("XSS")</script>'), 'scriptalert("XSS")/script');
  assert.equal(sanitizeName('Maria <Cruz>'), 'Maria Cruz');
});

test("sanitizeName trims and clamps to 100 chars", () => {
  assert.equal(sanitizeName('   José Reyes   '), 'José Reyes');
  const long = 'a'.repeat(150);
  assert.equal(sanitizeName(long)?.length, 100);
});

test("sanitizeName returns null for non-strings and empty inputs", () => {
  assert.equal(sanitizeName(undefined), null);
  assert.equal(sanitizeName(null), null);
  assert.equal(sanitizeName(123), null);
  assert.equal(sanitizeName('   '), null);
  assert.equal(sanitizeName('<>'), null);
});

test("sanitizeName preserves Unicode names with accents and apostrophes", () => {
  assert.equal(sanitizeName("María José D'Cruz-Smith"), "María José D'Cruz-Smith");
});

test("sanitizePhone clears HTML payloads", () => {
  // Phone payload like '<script>alert("XSS")</script>' is invalid format → cleared.
  assert.equal(sanitizePhone('<script>alert("XSS")</script>'), '');
});

test("sanitizePhone accepts well-formed international numbers", () => {
  assert.equal(sanitizePhone('+63 912 345 6789'), '+63 912 345 6789');
  assert.equal(sanitizePhone('(02) 8123-4567'), '(02) 8123-4567');
  assert.equal(sanitizePhone('09171234567'), '09171234567');
});

test("sanitizePhone clears malformed entries", () => {
  assert.equal(sanitizePhone('not-a-phone'), '');
  assert.equal(sanitizePhone('123'), ''); // too short (< 7)
  assert.equal(sanitizePhone('1'.repeat(25)), ''); // too long
});

test("sanitizePhone returns empty string for empty input, null for non-string", () => {
  assert.equal(sanitizePhone(''), '');
  assert.equal(sanitizePhone(undefined), null);
});

test("sanitizeProfileFields returns no patches for clean data", () => {
  const result = sanitizeProfileFields({
    name: 'Juan dela Cruz',
    phone: '+63 912 345 6789',
  });
  assert.equal(result.changed, false);
  assert.deepEqual(result.patches, {});
});

test("sanitizeProfileFields produces patches only for fields that changed", () => {
  const result = sanitizeProfileFields({
    name: '<script>evil</script>',
    phone: '+63 912 345 6789', // already clean
  });
  assert.equal(result.changed, true);
  assert.deepEqual(Object.keys(result.patches), ['name']);
  assert.equal(result.patches.name, 'scriptevil/script');
});

test("sanitizeProfileFields ignores fields not present in input", () => {
  const result = sanitizeProfileFields({ totalXP: 500 });
  assert.equal(result.changed, false);
  assert.deepEqual(result.patches, {});
});
