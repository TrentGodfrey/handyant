import assert from "node:assert/strict";
import test from "node:test";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import nextConfig from "../../next.config";
import { config } from "../proxy";

function proxyMatches(url: string): boolean {
  return unstable_doesMiddlewareMatch({
    config,
    nextConfig,
    url,
  });
}

test("photo upload routes bypass proxy body cloning without widening the exception", () => {
  assert.equal(proxyMatches("/api/photos"), false);
  assert.equal(proxyMatches("/api/photos/48f0e824-93b5-4d1b-b34c-cd6bb6f5b34f"), false);
  assert.equal(proxyMatches("/api/photosynthesis"), true);
  assert.equal(proxyMatches("/api/bookings"), true);
  assert.equal(proxyMatches("/dashboard"), true);
});
