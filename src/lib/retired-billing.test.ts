import assert from "node:assert/strict";
import test from "node:test";
import { retiredBillingResponse } from "./retired-billing";

test("retired in-app billing handlers fail closed with HTTP 410", async () => {
  const response = retiredBillingResponse();
  assert.equal(response.status, 410);
  assert.deepEqual(await response.json(), {
    error: "Billing is managed directly by MCQ in Square.",
  });
});
