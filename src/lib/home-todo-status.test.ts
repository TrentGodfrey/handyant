import assert from "node:assert/strict";
import test from "node:test";

import {
  countOpenHomeTodos,
  isOpenHomeTodoStatus,
  normalizeHomeTodoStatus,
} from "./home-todo-status";

test("home to-do status normalization handles current and legacy spellings", () => {
  assert.equal(normalizeHomeTodoStatus(" completed "), "completed");
  assert.equal(normalizeHomeTodoStatus("DONE"), "completed");
  assert.equal(normalizeHomeTodoStatus("in_progress"), "in-progress");
  assert.equal(normalizeHomeTodoStatus("needs parts"), "needs-parts");
});

test("only completed and legacy done home tasks are closed", () => {
  assert.equal(isOpenHomeTodoStatus("pending"), true);
  assert.equal(isOpenHomeTodoStatus("in-progress"), true);
  assert.equal(isOpenHomeTodoStatus("in_progress"), true);
  assert.equal(isOpenHomeTodoStatus("needs-parts"), true);
  assert.equal(isOpenHomeTodoStatus("needs_parts"), true);
  assert.equal(isOpenHomeTodoStatus("completed"), false);
  assert.equal(isOpenHomeTodoStatus("done"), false);
});

test("the roster counts each open home task once regardless of booking snapshots", () => {
  const todos = [
    { status: "pending" },
    { status: "completed" },
    { status: "done" },
    { status: "in-progress" },
    { status: "needs_parts" },
  ];

  assert.equal(countOpenHomeTodos(todos), 3);
});

test("unknown legacy statuses remain visible as open work", () => {
  assert.equal(isOpenHomeTodoStatus("awaiting-customer"), true);
  assert.equal(isOpenHomeTodoStatus(null), true);
});
