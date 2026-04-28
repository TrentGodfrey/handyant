import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { compare } from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).id as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      homes: true,
      subscriptions: { where: { status: "active" }, take: 1 },
      notifications: { where: { read: false }, orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const { passwordHash: _, ...safeUser } = user;
  return Response.json(safeUser);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).id as string;
  const body = await req.json();

  const allowedFields = ["name", "phone", "email", "avatarUrl"];
  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  // If email is changing, require password re-entry, ensure uniqueness, and
  // mark email unverified so the verification flow re-runs.
  if (typeof data.email === "string") {
    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, passwordHash: true },
    });
    if (!current) return Response.json({ error: "User not found" }, { status: 404 });

    const newEmail = (data.email as string).trim().toLowerCase();
    data.email = newEmail;

    if (newEmail !== (current.email ?? "").toLowerCase()) {
      if (!body.currentPassword || typeof body.currentPassword !== "string") {
        return Response.json(
          { error: "currentPassword required to change email" },
          { status: 400 }
        );
      }
      if (!current.passwordHash) {
        return Response.json(
          { error: "Cannot change email: account has no password set" },
          { status: 400 }
        );
      }
      const ok = await compare(body.currentPassword, current.passwordHash);
      if (!ok) {
        return Response.json({ error: "Incorrect password" }, { status: 401 });
      }

      const taken = await prisma.user.findUnique({ where: { email: newEmail } });
      if (taken && taken.id !== userId) {
        return Response.json({ error: "Email already in use" }, { status: 409 });
      }

      // Flag for the email-verification agent to pick up.
      data.emailVerified = false;
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
  });

  const { passwordHash: _, ...safeUser } = user;
  return Response.json(safeUser);
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).id as string;

  // Hard delete — relies on Prisma cascade on related rows (homes, etc.).
  // Bookings and conversations have onDelete: NoAction so we anonymize first
  // by clearing the FK soft-association where possible. The simplest path that
  // doesn't violate constraints is to hard-delete homes/subscriptions/notifications
  // that cascade, then delete the user. If FK errors arise we fall back to a soft delete.
  try {
    await prisma.user.delete({ where: { id: userId } });
    return Response.json({ ok: true });
  } catch {
    // Soft delete fallback — anonymize the account.
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: null,
        name: "Deleted user",
        phone: null,
        avatarUrl: null,
        passwordHash: null,
        googleId: null,
      },
    });
    return Response.json({ ok: true, soft: true });
  }
}
