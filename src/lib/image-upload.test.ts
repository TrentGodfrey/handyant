import assert from "node:assert/strict";
import test from "node:test";
import {
  detectVideoType,
  MAX_VIDEO_REQUEST_BYTES,
  validateMediaBuffer,
} from "./imageUpload";
import { MAX_VIDEO_BYTES } from "./media";

test("recognizes the QuickTime header used by the supplied iPhone HEVC clip", () => {
  // First 16 bytes of 80703743565__FC85051C-063E-45ED-B4F5-E568E729C45F.mov.
  const quickTimeHeader = Buffer.from(
    "00000014667479707174202000000000",
    "hex",
  );
  assert.equal(detectVideoType(quickTimeHeader), "mov");
  assert.deepEqual(validateMediaBuffer(quickTimeHeader), {
    ok: true,
    data: { ext: "mov", kind: "video" },
  });
});

test("does not mistake an ISO-container HEIC image for a video", () => {
  const heicHeader = Buffer.from("00000018667479706865696300000000", "hex");
  assert.equal(detectVideoType(heicHeader), null);
});

test("video and multipart budgets remain below Cloudflare's request ceiling", () => {
  assert.ok(MAX_VIDEO_REQUEST_BYTES > MAX_VIDEO_BYTES);
  assert.ok(MAX_VIDEO_REQUEST_BYTES < 100_000_000);
});
