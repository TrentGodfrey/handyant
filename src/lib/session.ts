import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export interface SessionUser {
  id: string;
  role: "customer" | "tech";
  name?: string | null;
  email?: string | null;
}

export async function requireUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return {
    id: session.user.id,
    role: session.user.role ?? "customer",
    name: session.user.name,
    email: session.user.email,
  };
}

export async function requireTech(): Promise<SessionUser | null> {
  const user = await requireUser();
  if (!user || user.role !== "tech") return null;
  return user;
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}

export function notFound(label = "Not found") {
  return Response.json({ error: label }, { status: 404 });
}

export function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}
