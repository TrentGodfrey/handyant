import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  let body: { token?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!token) {
    return Response.json({ error: "Reset token is required" }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findFirst({
    where: { passwordResetToken: token },
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
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  });

  return Response.json({ ok: true });
}
