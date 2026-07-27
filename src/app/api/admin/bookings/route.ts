import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptHomeAccess } from "@/lib/sensitive-data";
import { requireTech, unauthorized } from "@/lib/session";
import { bookingDateToDatabaseDate } from "@/lib/booking-time";

export async function GET(req: NextRequest) {
  const tech = await requireTech();
  if (!tech) return unauthorized();

  const status = req.nextUrl.searchParams.get("status");
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  const where: Record<string, unknown> = status ? { status } : { status: { not: "cancelled" } };
  if (!tech.isAdmin) where.techId = tech.id;
  if (from || to) {
    const dateRange: Record<string, Date> = {};
    if (from) {
      const value = bookingDateToDatabaseDate(from);
      if (!value) return Response.json({ error: "Invalid from date" }, { status: 400 });
      dateRange.gte = value;
    }
    if (to) {
      const value = bookingDateToDatabaseDate(to);
      if (!value) return Response.json({ error: "Invalid to date" }, { status: 400 });
      dateRange.lt = value;
    }
    where.scheduledDate = dateRange;
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      home: true,
      customer: { select: { id: true, name: true, phone: true, email: true, avatarUrl: true } },
      tech: { select: { id: true, name: true, avatarUrl: true } },
      categories: { include: { category: true } },
      tasks: { orderBy: { sortOrder: "asc" } },
      parts: true,
      photos: true,
    },
    orderBy: [{ scheduledDate: "asc" }, { scheduledTime: "asc" }],
  });

  return Response.json(bookings.map((booking) => ({
    ...booking,
    estimatedCost: null,
    finalCost: null,
    home:
      booking.home && booking.home.customerId === booking.customerId
        ? decryptHomeAccess(booking.home)
        : null,
  })));
}
