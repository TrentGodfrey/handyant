import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@/generated/prisma/client";
import {
  isPrismaTransactionConflict,
  linkedBookingTaskSnapshotPatch,
  syncLinkedActiveBookingTasks,
} from "./home-task-sync";

const homeTask = {
  task: "Repair the patio gate",
  description: "Gate sticks after rain",
  notes: null,
  status: "pending",
};

test("home-task edits map only shared booking-task snapshot fields", () => {
  assert.deepEqual(
    linkedBookingTaskSnapshotPatch(
      { ...homeTask, task: "Adjust the patio gate" },
      { task: "Adjust the patio gate", partsDescription: "New hinge" },
    ),
    { label: "Adjust the patio gate" },
  );
  assert.deepEqual(
    linkedBookingTaskSnapshotPatch(
      { ...homeTask, notes: "Customer will unlock it" },
      { notes: "Customer will unlock it" },
    ),
    { notes: "Customer will unlock it" },
  );
  assert.deepEqual(
    linkedBookingTaskSnapshotPatch(homeTask, { description: homeTask.description }),
    { notes: "Gate sticks after rain" },
  );
  assert.deepEqual(
    linkedBookingTaskSnapshotPatch(
      { ...homeTask, status: "completed" },
      { status: "completed" },
    ),
    { done: true },
  );
  assert.deepEqual(
    linkedBookingTaskSnapshotPatch(homeTask, { status: "pending" }),
    { done: false },
  );
});

test("linked task sync targets active visits and preserves historical snapshots", async () => {
  let call: unknown;
  const tx = {
    task: {
      updateMany: async (args: unknown) => {
        call = args;
        return { count: 2 };
      },
    },
  } as unknown as Pick<Prisma.TransactionClient, "task">;

  const count = await syncLinkedActiveBookingTasks(
    tx,
    "todo-1",
    { ...homeTask, task: "Adjust the patio gate", status: "completed" },
    { task: "Adjust the patio gate", status: "completed" },
  );

  assert.equal(count, 2);
  assert.deepEqual(call, {
    where: {
      homeTodoId: "todo-1",
      booking: {
        status: { in: ["pending", "confirmed", "in_progress"] },
      },
    },
    data: {
      label: "Adjust the patio gate",
      done: true,
    },
  });
});

test("booking-only or parts edits do not rewrite linked task snapshots", async () => {
  let called = false;
  const tx = {
    task: {
      updateMany: async () => {
        called = true;
        return { count: 1 };
      },
    },
  } as unknown as Pick<Prisma.TransactionClient, "task">;

  const count = await syncLinkedActiveBookingTasks(
    tx,
    "todo-1",
    homeTask,
    { partsDescription: "Weatherproof hinge", priority: "high" },
  );

  assert.equal(count, 0);
  assert.equal(called, false);
});

test("Prisma serializable write conflicts are recognized", () => {
  assert.equal(isPrismaTransactionConflict({ code: "P2034" }), true);
  assert.equal(isPrismaTransactionConflict({ code: "P2002" }), false);
  assert.equal(isPrismaTransactionConflict(new Error("P2034")), false);
});
