import assert from "node:assert/strict";
import test from "node:test";
import { uploadQuotaError } from "./upload-quota-policy";

test("upload quotas enforce both the account and VPS byte budgets", () => {
  assert.equal(
    uploadQuotaError({
      accountBytes: 80,
      globalBytes: 500,
      incomingBytes: 20,
      accountLimitBytes: 100,
      globalLimitBytes: 1_000,
    }),
    null,
  );
  assert.match(
    uploadQuotaError({
      accountBytes: 81,
      globalBytes: 500,
      incomingBytes: 20,
      accountLimitBytes: 100,
      globalLimitBytes: 1_000,
    }) ?? "",
    /account/,
  );
  assert.match(
    uploadQuotaError({
      accountBytes: 0,
      globalBytes: 981,
      incomingBytes: 20,
      accountLimitBytes: 100,
      globalLimitBytes: 1_000,
    }) ?? "",
    /temporarily full/,
  );
});
