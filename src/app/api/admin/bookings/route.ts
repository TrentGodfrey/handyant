import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTech, unauthorized } from "@/lib/session";

export async function GET(req: NextRequest) {
  const tech = await requireTech();
  if (!tech) return unauthorized();

  const status = req.nextUrl.searchParams.get("status");
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (from || to) {
    const dateRange: Record<string, Date> = {};
    if (from) dateRange.gte = new Date(from);
    if (to) dateRange.lte = new Date(to);
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

  return Response.json(bookings);
}
