import assert from "node:assert/strict";
import test from "node:test";
import { bookingListWhere } from "./booking-view";

test("customer booking lists are always scoped to the signed-in customer", () => {
  assert.deepEqual(bookingListWhere({ id: "customer-1", role: "customer" }, null), {
    customerId: "customer-1",
  });
});

test("staff booking lists default to assigned jobs", () => {
  assert.deepEqual(bookingListWhere({ id: "tech-1", role: "tech" }, null), {
    techId: "tech-1",
  });
});

test("staff customer preview cannot leak assigned customer jobs", () => {
  assert.deepEqual(bookingListWhere({ id: "tech-1", role: "tech" }, "customer"), {
    customerId: "tech-1",
  });
});
