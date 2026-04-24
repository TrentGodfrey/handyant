import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, notFound, forbidden } from "@/lib/session";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; photoId: string }> }
) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id, photoId } = await ctx.params;

  const home = await prisma.home.findUnique({ where: { id } });
  if (!home) return notFound("Home not found");
  if (home.customerId !== user.id && user.role !== "tech") return forbidden();

  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo || photo.homeId !== id) return notFound("Photo not found");

  await prisma.photo.delete({ where: { id: photoId } });
  return Response.json({ ok: true });
}
