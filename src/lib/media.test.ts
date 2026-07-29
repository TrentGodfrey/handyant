import assert from "node:assert/strict";
import test from "node:test";
import { getVideoFileExtension, isVideoUrl } from "./media";

test("recognizes standard and alternate QuickTime MIME types", () => {
  assert.equal(
    getVideoFileExtension({ name: "clip.mov", type: "video/quicktime" }),
    "mov",
  );
  assert.equal(
    getVideoFileExtension({ name: "clip", type: "video/x-quicktime" }),
    "mov",
  );
  assert.equal(
    getVideoFileExtension({
      name: "clip",
      type: "video/quicktime; codecs=hvc1",
    }),
    "mov",
  );
});

test("recognizes iOS MOV files when Files or Messages omits the MIME type", () => {
  assert.equal(getVideoFileExtension({ name: "IMG_7099.MOV", type: "" }), "mov");
  assert.equal(
    getVideoFileExtension({
      name: "IMG_7099.mov",
      type: "application/octet-stream",
    }),
    "mov",
  );
});

test("does not trust a video extension that contradicts a specific non-video MIME", () => {
  assert.equal(
    getVideoFileExtension({ name: "renamed.mov", type: "image/jpeg" }),
    null,
  );
  assert.equal(
    getVideoFileExtension({ name: "renamed.mov", type: "text/plain" }),
    null,
  );
  assert.equal(
    getVideoFileExtension({ name: "unsupported.avi", type: "video/avi" }),
    null,
  );
});

test("recognizes protected local video URLs", () => {
  assert.equal(isVideoUrl("/api/uploads/id.mp4"), true);
  assert.equal(isVideoUrl("/api/uploads/id.MOV?v=1"), true);
  assert.equal(isVideoUrl("/api/uploads/id.webm"), true);
  assert.equal(isVideoUrl("/api/uploads/id.jpg"), false);
});
