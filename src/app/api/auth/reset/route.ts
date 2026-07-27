import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimited, requestIp, takeRateLimit } from "@/lib/rate-limit";
import { hashSecurityToken } from "@/lib/security-tokens";
import { MAX_PASSWORD_LENGTH } from "@/lib/login-security";

export async function POST(req: NextRequest) {
  let body: { token?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";
  const limit = takeRateLimit(`reset:${requestIp(req)}`, 10, 15 * 60 * 1000);
  if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);

  if (!token) {
    return Response.json({ error: "Reset token is required" }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return Response.json(
      { error: `Password must be at most ${MAX_PASSWORD_LENGTH} characters` },
      { status: 400 },
    );
  }

  const user = await prisma.user.findFirst({
    where: { passwordResetToken: hashSecurityToken(token) },
    select: { id: true, passwordResetExpires: true },
  });

  if (!user) {
    return Response.json(
      { error: "Invalid or expired reset link" },
      { status: 400 }
    );
  }
  if (
    !user.passwordResetExpires ||
    user.passwordResetExpires.getTime() < Date.now()
  ) {
    return Response.json(
      { error: "Reset link has expired. Please request a new one." },
      { status: 400 }
    );
  }

  const passwordHash = await hash(password, 12);
  const consumed = await prisma.user.updateMany({
    where: {
      id: user.id,
      passwordResetToken: hashSecurityToken(token),
      passwordResetExpires: { gt: new Date() },
    },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpires: null,
      sessionVersion: { increment: 1 },
    },
  });
  if (consumed.count !== 1) {
    return Response.json(
      { error: "Invalid or expired reset link" },
      { status: 400 },
    );
  }

  return Response.json({ ok: true });
}
