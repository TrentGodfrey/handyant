import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import test from "node:test";
import { createHomeInviteToken, hashHomeInviteToken, normalizeEmail } from "./home-invitations";
import {
  decryptSensitiveValue,
  encryptSensitiveValue,
  isEncryptedSensitiveValue,
} from "./sensitive-data";
import { isValidSquareWebhookSignature } from "./square";
import { takeRateLimit } from "./rate-limit";
import { hashSecurityToken } from "./security-tokens";
import {
  HOME_HISTORY_DELETE_CONFIRMATION,
  isConfirmedHomeHistoryDeletion,
} from "./home-deletion";
import { getLocalUploadFilename } from "./upload-storage";

test("home invitation tokens are random, normalized, and stored only as hashes", () => {
  const first = createHomeInviteToken();
  const second = createHomeInviteToken();
  assert.notEqual(first, second);
  assert.equal(hashHomeInviteToken(first).length, 64);
  assert.notEqual(hashHomeInviteToken(first), first);
  assert.equal(normalizeEmail("  Customer@Example.COM "), "customer@example.com");
  assert.equal(hashSecurityToken("secret").length, 64);
});

test("sensitive home access values round-trip with authenticated encryption", () => {
  const originalKey = process.env.DATA_ENCRYPTION_KEY;
  process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  try {
    const encrypted = encryptSensitiveValue("Gate #7391");
    assert.ok(encrypted);
    assert.equal(isEncryptedSensitiveValue(encrypted), true);
    assert.notEqual(encrypted, "Gate #7391");
    assert.equal(decryptSensitiveValue(encrypted), "Gate #7391");
    assert.equal(decryptSensitiveValue("legacy plaintext"), "legacy plaintext");
  } finally {
    if (originalKey === undefined) delete process.env.DATA_ENCRYPTION_KEY;
    else process.env.DATA_ENCRYPTION_KEY = originalKey;
  }
});

test("Square webhook validation accepts only the correct URL/body signature", () => {
  const originalKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const key = "unit-test-signature-key";
  const url = "https://mcqpropertycare.com/api/webhooks/square";
  const rawBody = JSON.stringify({ event_id: "event-1", type: "payment.updated" });
  process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = key;
  try {
    const signature = createHmac("sha256", key).update(url + rawBody).digest("base64");
    assert.equal(isValidSquareWebhookSignature({ rawBody, signature, notificationUrl: url }), true);
    assert.equal(isValidSquareWebhookSignature({ rawBody: `${rawBody} `, signature, notificationUrl: url }), false);
    assert.equal(isValidSquareWebhookSignature({ rawBody, signature, notificationUrl: `${url}/wrong` }), false);
  } finally {
    if (originalKey === undefined) delete process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    else process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = originalKey;
  }
});

test("rate limiting closes after the configured request budget", () => {
  const key = `unit-${randomBytes(8).toString("hex")}`;
  assert.equal(takeRateLimit(key, 2, 60_000, 1_000).allowed, true);
  assert.equal(takeRateLimit(key, 2, 60_000, 1_001).allowed, true);
  const blocked = takeRateLimit(key, 2, 60_000, 1_002);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds, 60);
  assert.equal(takeRateLimit(key, 2, 60_000, 61_001).allowed, true);
});

test("home history deletion requires the exact destructive confirmation", () => {
  assert.equal(
    isConfirmedHomeHistoryDeletion({
      deleteHistory: true,
      confirmation: HOME_HISTORY_DELETE_CONFIRMATION,
    }),
    true,
  );
  assert.equal(isConfirmedHomeHistoryDeletion({ deleteHistory: true, confirmation: "delete" }), false);
  assert.equal(isConfirmedHomeHistoryDeletion({ confirmation: HOME_HISTORY_DELETE_CONFIRMATION }), false);
  assert.equal(isConfirmedHomeHistoryDeletion(null), false);
});

test("upload cleanup accepts only generated local image paths", () => {
  assert.equal(getLocalUploadFilename("/api/uploads/photo-id.jpg"), "photo-id.jpg");
  assert.equal(getLocalUploadFilename("/uploads/legacy.png"), "legacy.png");
  assert.equal(getLocalUploadFilename("https://example.com/photo.jpg"), null);
  assert.equal(getLocalUploadFilename("/api/uploads/../../secret.jpg"), null);
  assert.equal(getLocalUploadFilename("/api/uploads/photo.svg"), null);
});
