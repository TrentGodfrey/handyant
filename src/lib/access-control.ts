export const PRIVILEGED_SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;
export const ACTIVE_HOME_ASSIGNMENT_STATUSES = [
  "pending",
  "confirmed",
  "in_progress",
] as const;

export interface SessionSecurityClaims {
  role: "customer" | "tech";
  isAdmin: boolean;
  sessionVersion: number;
  mustChangePassword: boolean;
  privilegedExpiresAt?: number | null;
}

export interface CurrentUserSecurityState {
  role: "customer" | "tech";
  isAdmin: boolean;
  sessionVersion: number;
  mustChangePassword: boolean;
}

export type PrivilegedPageAccessDecision =
  | "allow"
  | "allow_demo"
  | "login"
  | "expired"
  | "customer_home"
  | "password_change"
  | "staff_home";

export function hasAdminAccess(user: Pick<CurrentUserSecurityState, "role" | "isAdmin">): boolean {
  return user.role === "tech" && user.isAdmin;
}

export function privilegedPageAccessDecision({
  hasSession,
  currentUser,
  demoMode,
  ownerOnly = false,
}: {
  hasSession: boolean;
  currentUser: CurrentUserSecurityState | null;
  demoMode: boolean;
  ownerOnly?: boolean;
}): PrivilegedPageAccessDecision {
  if (!hasSession) return demoMode ? "allow_demo" : "login";
  if (!currentUser) return "expired";
  if (currentUser.role !== "tech") return "customer_home";
  if (currentUser.mustChangePassword) return "password_change";
  if (ownerOnly && !hasAdminAccess(currentUser)) return "staff_home";
  return "allow";
}

export function canAccessBookingResource(
  user: { id: string; role: "customer" | "tech"; isAdmin: boolean },
  booking: { customerId: string; techId: string | null },
): boolean {
  return (
    booking.customerId === user.id ||
    (user.role === "tech" && (user.isAdmin || booking.techId === user.id))
  );
}

export function canMutateSharedHomeNote(
  user: { id: string; role: "customer" | "tech"; isAdmin: boolean },
  authorId: string | null,
): boolean {
  return (
    user.role === "tech" &&
    (user.isAdmin || (authorId !== null && authorId === user.id))
  );
}

export function isPrivilegedSessionActive(
  claims: Pick<SessionSecurityClaims, "role" | "privilegedExpiresAt">,
  now = Date.now(),
): boolean {
  if (claims.role !== "tech") return true;
  return typeof claims.privilegedExpiresAt === "number" && claims.privilegedExpiresAt > now;
}

export function sessionClaimsMatchCurrentUser(
  claims: SessionSecurityClaims,
  current: CurrentUserSecurityState,
  now = Date.now(),
): boolean {
  return (
    claims.role === current.role &&
    claims.isAdmin === current.isAdmin &&
    claims.sessionVersion === current.sessionVersion &&
    claims.mustChangePassword === current.mustChangePassword &&
    isPrivilegedSessionActive(claims, now)
  );
}

export function canAccessWhilePasswordChangeRequired(pathname: string): boolean {
  return (
    pathname === "/account/manage" ||
    pathname === "/api/me/password" ||
    pathname === "/api/auth" ||
    pathname.startsWith("/api/auth/")
  );
}
