import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, notFound, forbidden } from "@/lib/session";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo) return notFound("Photo not found");

  // Check ownership: photo must belong to a home or booking the user owns,
  // unless the user is a tech (techs can manage photos on jobs they cover).
  if (photo.homeId) {
    const home = await prisma.home.findUnique({
      where: { id: photo.homeId },
      select: { customerId: true },
    });
    if (!home) return notFound("Home not found");
    if (home.customerId !== user.id && user.role !== "tech") return forbidden();
  } else if (photo.bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: photo.bookingId },
      select: { customerId: true, techId: true },
    });
    if (!booking) return notFound("Booking not found");
    if (booking.customerId !== user.id && booking.techId !== user.id && user.role !== "tech") {
      return forbidden();
    }
  } else if (user.role !== "tech") {
    // Orphan photo with no owner reference - only techs can clean these up.
    return forbidden();
  }

  await prisma.photo.delete({ where: { id } });
  return Response.json({ ok: true });
}
