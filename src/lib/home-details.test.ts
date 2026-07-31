import assert from "node:assert/strict";
import test from "node:test";

import {
  buildYearBuiltOptions,
  validatePanelAmps,
  validateWaterHeaterYear,
  validateYearBuilt,
} from "./home-details";

const NOW = new Date("2026-07-28T12:00:00Z");

test("year-built options span 1900 through next year, newest first", () => {
  const options = buildYearBuiltOptions(NOW);
  assert.equal(options[0], 2027);
  assert.equal(options.at(-1), 1900);
  assert.equal(options.length, 2027 - 1900 + 1);
  // The bug this replaced: a hard-coded list ending at 2000.
  assert.ok(options.includes(1952));
  assert.ok(options.includes(2025));
});

test("validateYearBuilt accepts old homes and rejects impossible ones", () => {
  assert.deepEqual(validateYearBuilt(1948, NOW), { ok: true, value: 1948 });
  assert.deepEqual(validateYearBuilt("1948", NOW), { ok: true, value: 1948 });
  assert.deepEqual(validateYearBuilt(2027, NOW), { ok: true, value: 2027 });
  assert.equal(validateYearBuilt(2099, NOW).ok, false);
  assert.equal(validateYearBuilt(1500, NOW).ok, false);
  // A fat-fingered extra digit is the realistic failure on a free number field.
  assert.equal(validateYearBuilt(20255, NOW).ok, false);
  assert.equal(validateYearBuilt(1990.5, NOW).ok, false);
  assert.equal(validateYearBuilt("not a year", NOW).ok, false);
});

test("blank values clear the field rather than erroring", () => {
  assert.deepEqual(validateYearBuilt("", NOW), { ok: true, value: null });
  assert.deepEqual(validateYearBuilt(null, NOW), { ok: true, value: null });
  assert.deepEqual(validateYearBuilt(undefined, NOW), { ok: true, value: null });
});

test("water heater year and panel amps enforce their own ranges", () => {
  assert.deepEqual(validateWaterHeaterYear(2018, NOW), { ok: true, value: 2018 });
  assert.equal(validateWaterHeaterYear(1850, NOW).ok, false);
  assert.deepEqual(validatePanelAmps(200), { ok: true, value: 200 });
  assert.equal(validatePanelAmps(5).ok, false);
  assert.equal(validatePanelAmps(99999).ok, false);
});
