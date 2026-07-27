import assert from "node:assert/strict";
import test from "node:test";
import { optionalBoundedText, requiredBoundedText } from "./text-input";

test("required bounded text trims valid input and rejects empty or oversized input", () => {
  assert.deepEqual(requiredBoundedText("  Fix sink  ", "Task", 20), {
    ok: true,
    value: "Fix sink",
  });
  assert.equal(requiredBoundedText("   ", "Task", 20).ok, false);
  const oversized = requiredBoundedText("12345", "Task", 4);
  assert.equal(oversized.ok, false);
  if (!oversized.ok) assert.match(oversized.message, /max 4/);
});

test("optional bounded text normalizes blanks without coercing non-text values", () => {
  assert.deepEqual(optionalBoundedText("   ", "Notes", 20), {
    ok: true,
    value: null,
  });
  assert.equal(optionalBoundedText(42, "Notes", 20).ok, false);
  assert.deepEqual(optionalBoundedText(undefined, "Notes", 20), {
    ok: true,
    value: null,
  });
});
