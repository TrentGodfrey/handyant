import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, notFound, forbidden } from "@/lib/session";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; noteId: string }> },
) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (user.role !== "tech") return forbidden();

  const { id, noteId } = await ctx.params;
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return notFound("Booking not found");

  const note = await prisma.bookingNote.findUnique({ where: { id: noteId } });
  if (!note || note.bookingId !== id) return notFound("Note not found");

  // Only the author can delete their own note.
  if (note.authorId !== user.id) return forbidden();

  await prisma.bookingNote.delete({ where: { id: noteId } });
  return Response.json({ ok: true });
}
