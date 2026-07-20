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
    ["Moen faucet", "Ecobee thermostat"],
  );
});
