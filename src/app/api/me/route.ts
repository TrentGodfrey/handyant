import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, notFound, badRequest } from "@/lib/session";
import { decryptHomeAccess } from "@/lib/sensitive-data";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      homes: true,
      subscriptions: { where: { status: "active" }, take: 1 },
      notifications: { where: { read: false }, orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!dbUser) return notFound("User not found");

  const {
    passwordHash,
    passwordResetToken,
    passwordResetExpires,
    emailVerificationToken,
    emailVerificationExpires,
    ...safeUser
  } = dbUser;
  void passwordHash;
  void passwordResetToken;
  void passwordResetExpires;
  void emailVerificationToken;
  void emailVerificationExpires;
  return Response.json({ ...safeUser, homes: safeUser.homes.map(decryptHomeAccess) });
}

export async function PATCH(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const userId = user.id;
  const body = await req.json();

  if (body.email !== undefined) {
    return badRequest("Use the secure email-change flow to update your email address");
  }

  const allowedFields = ["name", "phone", "avatarUrl"];
  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
  });

  const {
    passwordHash,
    passwordResetToken,
    passwordResetExpires,
    emailVerificationToken,
    emailVerificationExpires,
    ...safeUser
  } = updated;
  void passwordHash;
  void passwordResetToken;
  void passwordResetExpires;
  void emailVerificationToken;
  void emailVerificationExpires;
  return Response.json(safeUser);
}

export async function DELETE() {
  const user = await requireUser();
  if (!user) return unauthorized();
  return Response.json(
    {
      error: "Self-service account deletion is disabled. Contact MCQ for verified assistance.",
      code: "CONTACT_SUPPORT_REQUIRED",
    },
    { status: 405, headers: { Allow: "GET, PATCH" } },
  );
}
