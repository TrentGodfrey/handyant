import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, notFound, forbidden } from "@/lib/session";
import { deleteLocalUploadFiles } from "@/lib/upload-storage";
import { canAccessBooking, canAccessHome } from "@/lib/resource-access";

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
    if (!(await canAccessHome(user, { ...home, id: photo.homeId }))) return forbidden();
  } else if (photo.bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: photo.bookingId },
      select: { customerId: true, techId: true },
    });
    if (!booking) return notFound("Booking not found");
    if (!canAccessBooking(user, booking)) return forbidden();
  } else if (!user.isAdmin) {
    // Orphan photo with no owner reference - only the owner can clean these up.
    return forbidden();
  }

  await prisma.photo.delete({ where: { id } });
  await deleteLocalUploadFiles([photo.url]);
  return Response.json({ ok: true });
}
