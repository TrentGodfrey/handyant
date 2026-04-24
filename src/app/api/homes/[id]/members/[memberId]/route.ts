import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, notFound, forbidden } from "@/lib/session";

const ALLOWED_FIELDS = ["name", "role", "phone", "sortOrder"];

async function ensureAccess(homeId: string) {
  const user = await requireUser();
  if (!user) return { error: unauthorized() };
  const home = await prisma.home.findUnique({ where: { id: homeId } });
  if (!home) return { error: notFound("Home not found") };
  if (home.customerId !== user.id) return { error: forbidden() };
  return { user, home };
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; memberId: string }> },
) {
  const { id, memberId } = await ctx.params;
  const access = await ensureAccess(id);
  if ("error" in access) return access.error;

  const member = await prisma.householdMember.findUnique({ where: { id: memberId } });
  if (!member || member.homeId !== id) return notFound("Member not found");

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  const updated = await prisma.householdMember.update({ where: { id: memberId }, data });
  return Response.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; memberId: string }> },
) {
  const { id, memberId } = await ctx.params;
  const access = await ensureAccess(id);
  if ("error" in access) return access.error;

  const member = await prisma.householdMember.findUnique({ where: { id: memberId } });
  if (!member || member.homeId !== id) return notFound("Member not found");

  await prisma.householdMember.delete({ where: { id: memberId } });
  return Response.json({ ok: true });
}
