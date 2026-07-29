import assert from "node:assert/strict";
import test from "node:test";
import {
  PRIVILEGED_SESSION_MAX_AGE_MS,
  canAccessBookingResource,
  canMutateSharedHomeNote,
  canAccessWhilePasswordChangeRequired,
  hasAdminAccess,
  homeResourceAccessDecision,
  isPrivilegedSessionActive,
  privilegedPageAccessDecision,
  sessionClaimsMatchCurrentUser,
} from "./access-control";
import {
  LOGIN_ACCOUNT_ATTEMPT_LIMIT,
  LOGIN_ACCOUNT_WINDOW_MS,
  LOGIN_IP_EMAIL_ATTEMPT_LIMIT,
  LOGIN_IP_EMAIL_WINDOW_MS,
  MAX_PASSWORD_LENGTH,
  credentialRequestIp,
  loginAccountRateLimitKey,
  loginIpEmailRateLimitKey,
  normalizeCredentialEmail,
} from "./login-security";
import { checkRateLimit, resetRateLimit, takeRateLimit } from "./rate-limit";

test("only an explicitly privileged technician has owner access", () => {
  assert.equal(hasAdminAccess({ role: "tech", isAdmin: true }), true);
  assert.equal(hasAdminAccess({ role: "tech", isAdmin: false }), false);
  assert.equal(hasAdminAccess({ role: "customer", isAdmin: true }), false);
});

test("booking resources are limited to the customer, owner, or assigned technician", () => {
  const booking = { customerId: "customer-1", techId: "tech-1" };
  assert.equal(
    canAccessBookingResource(
      { id: "customer-1", role: "customer", isAdmin: false },
      booking,
    ),
    true,
  );
  assert.equal(
    canAccessBookingResource(
      { id: "tech-1", role: "tech", isAdmin: false },
      booking,
    ),
    true,
  );
  assert.equal(
    canAccessBookingResource(
      { id: "owner", role: "tech", isAdmin: true },
      booking,
    ),
    true,
  );
  assert.equal(
    canAccessBookingResource(
      { id: "other-tech", role: "tech", isAdmin: false },
      booking,
    ),
    false,
  );
  assert.equal(
    canAccessBookingResource(
      { id: "other-customer", role: "customer", isAdmin: false },
      booking,
    ),
    false,
  );
});

test("home tasks are limited to the linked customer, owner, or an assigned technician", () => {
  const home = { customerId: "customer-1" };
  assert.equal(
    homeResourceAccessDecision(
      { id: "customer-1", role: "customer", isAdmin: false },
      home,
    ),
    "allow",
  );
  assert.equal(
    homeResourceAccessDecision(
      { id: "other-customer", role: "customer", isAdmin: false },
      home,
    ),
    "deny",
  );
  assert.equal(
    homeResourceAccessDecision(
      { id: "owner", role: "tech", isAdmin: true },
      home,
    ),
    "allow",
  );
  assert.equal(
    homeResourceAccessDecision(
      { id: "assigned-tech", role: "tech", isAdmin: false },
      home,
    ),
    "requires_assignment",
  );
});

test("ordinary technicians can mutate only their own shared home notes", () => {
  assert.equal(
    canMutateSharedHomeNote(
      { id: "tech-1", role: "tech", isAdmin: false },
      "tech-1",
    ),
    true,
  );
  assert.equal(
    canMutateSharedHomeNote(
      { id: "tech-1", role: "tech", isAdmin: false },
      "tech-2",
    ),
    false,
  );
  assert.equal(
    canMutateSharedHomeNote(
      { id: "tech-1", role: "tech", isAdmin: false },
      null,
    ),
    false,
  );
  assert.equal(
    canMutateSharedHomeNote(
      { id: "owner", role: "tech", isAdmin: true },
      null,
    ),
    true,
  );
  assert.equal(
    canMutateSharedHomeNote(
      { id: "customer", role: "customer", isAdmin: false },
      "customer",
    ),
    false,
  );
});

test("role, owner flag, or session-version changes revoke an existing session", () => {
  const now = Date.now();
  const claims = {
    role: "tech" as const,
    isAdmin: true,
    sessionVersion: 4,
    mustChangePassword: false,
    privilegedExpiresAt: now + PRIVILEGED_SESSION_MAX_AGE_MS,
  };

  assert.equal(
    sessionClaimsMatchCurrentUser(claims, {
      role: "tech",
      isAdmin: true,
      sessionVersion: 4,
      mustChangePassword: false,
    }, now),
    true,
  );
  assert.equal(
    sessionClaimsMatchCurrentUser(claims, {
      role: "customer",
      isAdmin: false,
      sessionVersion: 5,
      mustChangePassword: false,
    }, now),
    false,
  );
  assert.equal(
    sessionClaimsMatchCurrentUser(claims, {
      role: "tech",
      isAdmin: false,
      sessionVersion: 4,
      mustChangePassword: false,
    }, now),
    false,
  );
  assert.equal(
    sessionClaimsMatchCurrentUser(claims, {
      role: "tech",
      isAdmin: true,
      sessionVersion: 5,
      mustChangePassword: false,
    }, now),
    false,
  );
  assert.equal(
    sessionClaimsMatchCurrentUser(claims, {
      role: "tech",
      isAdmin: true,
      sessionVersion: 4,
      mustChangePassword: true,
    }, now),
    false,
  );
});

test("temporary-password staff can reach only the password-change authentication flow", () => {
  assert.equal(canAccessWhilePasswordChangeRequired("/account/manage"), true);
  assert.equal(canAccessWhilePasswordChangeRequired("/api/me/password"), true);
  assert.equal(canAccessWhilePasswordChangeRequired("/api/auth/session"), true);
  assert.equal(canAccessWhilePasswordChangeRequired("/dashboard"), false);
  assert.equal(canAccessWhilePasswordChangeRequired("/api/bookings"), false);
  assert.equal(canAccessWhilePasswordChangeRequired("/api/authentic"), false);
});

test("credential login limits normalize email and separate source addresses", () => {
  assert.equal(MAX_PASSWORD_LENGTH, 128);
  assert.equal(normalizeCredentialEmail("  Staff@Example.COM "), "staff@example.com");
  assert.equal(
    loginAccountRateLimitKey("Staff@Example.COM"),
    loginAccountRateLimitKey(" staff@example.com "),
  );
  assert.notEqual(
    loginIpEmailRateLimitKey("staff@example.com", "192.0.2.1"),
    loginIpEmailRateLimitKey("staff@example.com", "192.0.2.2"),
  );
  assert.equal(
    credentialRequestIp({
      "cf-connecting-ip": "198.51.100.8",
      "x-forwarded-for": "192.0.2.1, 192.0.2.2",
    }),
    "198.51.100.8",
  );
  assert.equal(
    credentialRequestIp({ "x-forwarded-for": "192.0.2.1, 192.0.2.2" }),
    "192.0.2.1",
  );
});

test("failed-login budgets block, reset on success, and keep a looser account cap", () => {
  const suffix = Date.now();
  const ipKey = `${loginIpEmailRateLimitKey("limited@example.com", "192.0.2.1")}:${suffix}`;
  const accountKey = `${loginAccountRateLimitKey("limited@example.com")}:${suffix}`;
  for (let attempt = 0; attempt < LOGIN_IP_EMAIL_ATTEMPT_LIMIT; attempt += 1) {
    takeRateLimit(
      ipKey,
      LOGIN_IP_EMAIL_ATTEMPT_LIMIT,
      LOGIN_IP_EMAIL_WINDOW_MS,
      1_000,
    );
  }
  assert.equal(
    checkRateLimit(ipKey, LOGIN_IP_EMAIL_ATTEMPT_LIMIT, 1_000).allowed,
    false,
  );
  assert.equal(checkRateLimit(accountKey, LOGIN_ACCOUNT_ATTEMPT_LIMIT, 1_000).allowed, true);
  resetRateLimit(ipKey);
  assert.equal(checkRateLimit(ipKey, LOGIN_IP_EMAIL_ATTEMPT_LIMIT, 1_000).allowed, true);

  for (let attempt = 0; attempt < LOGIN_ACCOUNT_ATTEMPT_LIMIT; attempt += 1) {
    takeRateLimit(accountKey, LOGIN_ACCOUNT_ATTEMPT_LIMIT, LOGIN_ACCOUNT_WINDOW_MS, 1_000);
  }
  assert.equal(checkRateLimit(accountKey, LOGIN_ACCOUNT_ATTEMPT_LIMIT, 1_000).allowed, false);
  resetRateLimit(accountKey);
});

test("privileged sessions expire after their dedicated short lifetime", () => {
  const now = Date.now();
  assert.equal(
    isPrivilegedSessionActive({
      role: "tech",
      privilegedExpiresAt: now + 1,
    }, now),
    true,
  );
  assert.equal(
    isPrivilegedSessionActive({
      role: "tech",
      privilegedExpiresAt: now,
    }, now),
    false,
  );
  assert.equal(
    isPrivilegedSessionActive({
      role: "customer",
      privilegedExpiresAt: null,
    }, now),
    true,
  );
});

test("privileged pages revalidate live staff state and reserve demo bypass for signed-out users", () => {
  const owner = {
    role: "tech" as const,
    isAdmin: true,
    sessionVersion: 1,
    mustChangePassword: false,
  };
  const staff = { ...owner, isAdmin: false };

  assert.equal(
    privilegedPageAccessDecision({
      hasSession: true,
      currentUser: owner,
      demoMode: false,
    }),
    "allow",
  );
  assert.equal(
    privilegedPageAccessDecision({
      hasSession: true,
      currentUser: owner,
      demoMode: false,
      ownerOnly: true,
    }),
    "allow",
  );
  assert.equal(
    privilegedPageAccessDecision({
      hasSession: true,
      currentUser: staff,
      demoMode: false,
      ownerOnly: true,
    }),
    "staff_home",
  );
  assert.equal(
    privilegedPageAccessDecision({
      hasSession: true,
      currentUser: { ...staff, mustChangePassword: true },
      demoMode: false,
    }),
    "password_change",
  );
  assert.equal(
    privilegedPageAccessDecision({
      hasSession: true,
      currentUser: null,
      demoMode: true,
    }),
    "expired",
  );
  assert.equal(
    privilegedPageAccessDecision({
      hasSession: true,
      currentUser: {
        ...owner,
        role: "customer",
        isAdmin: false,
      },
      demoMode: true,
    }),
    "customer_home",
  );
  assert.equal(
    privilegedPageAccessDecision({
      hasSession: false,
      currentUser: null,
      demoMode: true,
    }),
    "allow_demo",
  );
  assert.equal(
    privilegedPageAccessDecision({
      hasSession: false,
      currentUser: null,
      demoMode: false,
    }),
    "login",
  );
});
