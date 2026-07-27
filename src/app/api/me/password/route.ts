import { NextRequest } from "next/server";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, badRequest } from "@/lib/session";
import { MAX_PASSWORD_LENGTH } from "@/lib/login-security";
import { rateLimited, requestIp, takeRateLimit } from "@/lib/rate-limit";

export async function PATCH(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const limit = takeRateLimit(
    `password-change:${user.id}:${requestIp(req)}`,
    10,
    15 * 60 * 1000,
  );
  if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);

  const body = (await req.json().catch(() => null)) as {
    current?: string;
    next?: string;
  } | null;
  if (!body || typeof body !== "object") return badRequest("Invalid request body");
  if (!body.current || !body.next) {
    return badRequest("current and next required");
  }
  if (body.next.length < 8) {
    return badRequest("New password must be at least 8 characters");
  }
  if (
    body.current.length > MAX_PASSWORD_LENGTH ||
    body.next.length > MAX_PASSWORD_LENGTH
  ) {
    return badRequest(`Passwords must be at most ${MAX_PASSWORD_LENGTH} characters`);
  }

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });

  if (!record?.passwordHash) {
    return badRequest("Password not set on this account");
  }

  const valid = await compare(body.current, record.passwordHash);
  if (!valid) return badRequest("Current password is incorrect");

  const passwordHash = await hash(body.next, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      mustChangePassword: false,
      sessionVersion: { increment: 1 },
    },
  });

  return Response.json({ ok: true });
}
