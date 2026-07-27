import { getServerSession, type Session } from "next-auth";
import { authOptions } from "./auth";
import { hasAdminAccess, sessionClaimsMatchCurrentUser } from "./access-control";
import { prisma } from "./prisma";

export interface SessionUser {
  id: string;
  role: "customer" | "tech";
  isAdmin: boolean;
  sessionVersion: number;
  mustChangePassword: boolean;
  emailVerified: boolean;
  name?: string | null;
  email?: string | null;
}

export async function revalidateSessionUser(
  session: Session | null,
): Promise<SessionUser | null> {
  if (!session?.user) return null;
  const current = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      isAdmin: true,
      sessionVersion: true,
      mustChangePassword: true,
      name: true,
      email: true,
      emailVerified: true,
    },
  });
  if (!current) return null;
  if (!sessionClaimsMatchCurrentUser({
    role: session.user.role ?? "customer",
    isAdmin: session.user.isAdmin ?? false,
    sessionVersion: session.user.sessionVersion ?? -1,
    mustChangePassword: session.user.mustChangePassword ?? false,
    privilegedExpiresAt: session.user.privilegedExpiresAt,
  }, current)) {
    return null;
  }
  return {
    id: current.id,
    role: current.role,
    isAdmin: current.isAdmin,
    sessionVersion: current.sessionVersion,
    mustChangePassword: current.mustChangePassword,
    name: current.name,
    email: current.email,
    emailVerified: current.emailVerified === true,
  };
}

export async function requireUser(): Promise<SessionUser | null> {
  return revalidateSessionUser(await getServerSession(authOptions));
}

export async function requireTech(): Promise<SessionUser | null> {
  const user = await requireUser();
  if (!user || user.role !== "tech") return null;
  return user;
}

export async function requireAdmin(): Promise<SessionUser | null> {
  const user = await requireUser();
  if (!user || !hasAdminAccess(user)) return null;
  return user;
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}

export function verificationRequired() {
  return Response.json(
    { error: "Verify your email address before using this feature.", code: "EMAIL_VERIFICATION_REQUIRED" },
    { status: 403 },
  );
}

export function notFound(label = "Not found") {
  return Response.json({ error: label }, { status: 404 });
}

export function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}
