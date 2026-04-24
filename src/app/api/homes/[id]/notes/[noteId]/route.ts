import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, notFound, forbidden } from "@/lib/session";

const ALLOWED_FIELDS = ["title", "body", "severity"];

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; noteId: string }> },
) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (user.role !== "tech") return forbidden();

  const { id, noteId } = await ctx.params;
  const home = await prisma.home.findUnique({ where: { id } });
  if (!home) return notFound("Home not found");

  const note = await prisma.homeNote.findUnique({ where: { id: noteId } });
  if (!note || note.homeId !== id) return notFound("Note not found");

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  const updated = await prisma.homeNote.update({ where: { id: noteId }, data });
  return Response.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; noteId: string }> },
) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (user.role !== "tech") return forbidden();

  const { id, noteId } = await ctx.params;
  const home = await prisma.home.findUnique({ where: { id } });
  if (!home) return notFound("Home not found");

  const note = await prisma.homeNote.findUnique({ where: { id: noteId } });
  if (!note || note.homeId !== id) return notFound("Note not found");

  await prisma.homeNote.delete({ where: { id: noteId } });
  return Response.json({ ok: true });
}
