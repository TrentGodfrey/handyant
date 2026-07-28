import assert from "node:assert/strict";
import test from "node:test";

import {
  isPartPurchaseStatus,
  isPartsBuyer,
  normalizePartPurchaseStatus,
  normalizePartsBuyer,
  partPurchaseStatusLabel,
  partsBuyerLabel,
} from "./parts-status";

test("isPartsBuyer accepts only enum values", () => {
  assert.equal(isPartsBuyer("customer"), true);
  assert.equal(isPartsBuyer("tech"), true);
  assert.equal(isPartsBuyer("Anthony"), false);
  assert.equal(isPartsBuyer(null), false);
});

test("isPartPurchaseStatus accepts only enum values", () => {
  assert.equal(isPartPurchaseStatus("needed"), true);
  assert.equal(isPartPurchaseStatus("purchased"), true);
  assert.equal(isPartPurchaseStatus("Purchased"), false);
  assert.equal(isPartPurchaseStatus(undefined), false);
});

test("normalizePartsBuyer prefers the dedicated column", () => {
  assert.equal(normalizePartsBuyer("tech", "Customer to Purchase"), "tech");
  assert.equal(normalizePartsBuyer("customer", null), "customer");
});

test("normalizePartsBuyer falls back to legacy partStatus labels", () => {
  assert.equal(normalizePartsBuyer(null, "Anthony to Purchase"), "tech");
  assert.equal(normalizePartsBuyer(null, "Tech to Purchase"), "tech");
  assert.equal(normalizePartsBuyer(null, "Customer to Purchase"), "customer");
  assert.equal(normalizePartsBuyer(null, "Needs Purchase"), null);
  assert.equal(normalizePartsBuyer(null, null), null);
  assert.equal(normalizePartsBuyer("Anthony", "Customer to Purchase"), "customer");
});

test("normalizePartPurchaseStatus only treats explicit purchased as purchased", () => {
  assert.equal(normalizePartPurchaseStatus("purchased"), "purchased");
  assert.equal(normalizePartPurchaseStatus("Purchased"), "purchased");
  assert.equal(normalizePartPurchaseStatus(" PURCHASED "), "purchased");
  // Legacy buyer labels contain "purchase" but are not purchase states.
  assert.equal(normalizePartPurchaseStatus("Anthony to Purchase"), "needed");
  assert.equal(normalizePartPurchaseStatus("Customer to Purchase"), "needed");
  assert.equal(normalizePartPurchaseStatus("Needs Purchase"), "needed");
  assert.equal(normalizePartPurchaseStatus("needed"), "needed");
  assert.equal(normalizePartPurchaseStatus(null), "needed");
  assert.equal(normalizePartPurchaseStatus(undefined), "needed");
});

test("labels", () => {
  assert.equal(partsBuyerLabel("tech"), "Anthony buys");
  assert.equal(partsBuyerLabel("customer"), "Customer buys");
  assert.equal(partsBuyerLabel(null), null);
  assert.equal(
    partsBuyerLabel("customer", { customer: "You buy", tech: "Anthony buys" }),
    "You buy",
  );
  assert.equal(partPurchaseStatusLabel("purchased"), "Purchased");
  assert.equal(partPurchaseStatusLabel("needed"), "Needs purchase");
});
