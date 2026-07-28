import assert from "node:assert/strict";
import test from "node:test";
import { mergeBookingPartItems } from "./booking-parts";

test("parts saved on selected home tasks carry into the booking without duplicates", () => {
  assert.deepEqual(
    mergeBookingPartItems(
      ["Moen faucet", "  "],
      [
        { partsDescription: "Ecobee thermostat" },
        { parts: "moen FAUCET" },
        { partsDescription: null, parts: null },
      ],
    ),
    [
      { item: "Moen faucet", buyer: null, status: "needed" },
      { item: "Ecobee thermostat", buyer: null, status: "needed" },
    ],
  );
});

test("task parts carry buyer and purchase status into the booking", () => {
  assert.deepEqual(
    mergeBookingPartItems(
      [],
      [
        {
          partsDescription: "Broan fan motor",
          partsBuyer: "tech",
          partStatus: "purchased",
        },
        {
          parts: "GFCI outlet",
          partsBuyer: null,
          partStatus: "Customer to Purchase", // legacy label
        },
      ],
    ),
    [
      { item: "Broan fan motor", buyer: "tech", status: "purchased" },
      { item: "GFCI outlet", buyer: "customer", status: "needed" },
    ],
  );
});

test("first occurrence wins when a manual item duplicates a task part", () => {
  assert.deepEqual(
    mergeBookingPartItems(
      ["Ecobee thermostat"],
      [{ partsDescription: "ecobee thermostat", partsBuyer: "tech", partStatus: "purchased" }],
    ),
    [{ item: "Ecobee thermostat", buyer: null, status: "needed" }],
  );
});
