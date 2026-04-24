import { NextRequest } from "next/server";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, badRequest } from "@/lib/session";

export async function PATCH(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const body = (await req.json()) as { current?: string; next?: string };
  if (!body.current || !body.next) {
    return badRequest("current and next required");
  }
  if (body.next.length < 8) {
    return badRequest("New password must be at least 8 characters");
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
    data: { passwordHash },
  });

  return Response.json({ ok: true });
}
