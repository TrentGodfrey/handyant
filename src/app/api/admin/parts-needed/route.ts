import { prisma } from "@/lib/prisma";
import { requireTech, unauthorized } from "@/lib/session";
import { businessDateString } from "@/lib/booking-policy";
import { bookingDateToDatabaseDate } from "@/lib/booking-time";

export async function GET() {
  const tech = await requireTech();
  if (!tech) return unauthorized();

  const startOfDay = bookingDateToDatabaseDate(businessDateString())!;

  const parts = await prisma.part.findMany({
    where: {
      status: "needed",
      // Parts the homeowner is buying are not on Anthony's shopping list.
      OR: [{ buyer: null }, { buyer: { not: "customer" } }],
      booking: {
        techId: tech.id,
        status: { in: ["pending", "confirmed"] },
        scheduledDate: { gte: startOfDay },
      },
    },
    include: {
      booking: {
        select: {
          id: true,
          scheduledDate: true,
          customer: { select: { name: true } },
        },
      },
    },
  });

  const sorted = parts
    .map((p) => ({
      id: p.id,
      item: p.item,
      qty: p.qty ?? 1,
      cost: p.cost ? Number(p.cost.toString()) : 0,
      bookingId: p.bookingId,
      customerName: p.booking.customer.name,
      scheduledDate: p.booking.scheduledDate,
    }))
    .sort(
      (a, b) =>
        new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    )
    .slice(0, 10);

  return Response.json({ parts: sorted });
}
