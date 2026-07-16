import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTech, unauthorized, notFound } from "@/lib/session";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; noteId: string }> }
) {
  const user = await requireTech();
  if (!user) return unauthorized();
  const { id, noteId } = await ctx.params;

  const home = await prisma.home.findUnique({ where: { id } });
  if (!home) return notFound("Home not found");

  const note = await prisma.homeNote.findUnique({ where: { id: noteId } });
  if (!note || note.homeId !== id) return notFound("Note not found");

  const body = (await req.json()) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (typeof body.title === "string") data.title = body.title;
  if (typeof body.body === "string" || body.body === null) data.body = body.body;
  if (typeof body.severity === "string") data.severity = body.severity;

  const updated = await prisma.homeNote.update({ where: { id: noteId }, data });
  return Response.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; noteId: string }> }
) {
  const user = await requireTech();
  if (!user) return unauthorized();
  const { id, noteId } = await ctx.params;

  const home = await prisma.home.findUnique({ where: { id } });
  if (!home) return notFound("Home not found");

  const note = await prisma.homeNote.findUnique({ where: { id: noteId } });
  if (!note || note.homeId !== id) return notFound("Note not found");

  await prisma.homeNote.delete({ where: { id: noteId } });
  return Response.json({ ok: true });
}
