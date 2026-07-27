import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, notFound, forbidden } from "@/lib/session";
import { canAccessBooking } from "@/lib/resource-access";

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
  if (!canAccessBooking(user, booking)) return forbidden();

  const note = await prisma.bookingNote.findUnique({ where: { id: noteId } });
  if (!note || note.bookingId !== id) return notFound("Note not found");

  // Technicians may remove their own note; the owner may moderate any note.
  if (note.authorId !== user.id && !user.isAdmin) return forbidden();

  await prisma.bookingNote.delete({ where: { id: noteId } });
  return Response.json({ ok: true });
}
