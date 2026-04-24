import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, badRequest } from "@/lib/session";

export async function GET(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const techId = req.nextUrl.searchParams.get("techId");
  const where: Record<string, unknown> = techId
    ? { techId }
    : user.role === "tech"
      ? { techId: user.id }
      : { customerId: user.id };

  const reviews = await prisma.review.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true, avatarUrl: true } },
      booking: { select: { id: true, scheduledDate: true, description: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(reviews);
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const body = await req.json();
  if (!body.bookingId || !body.rating) return badRequest("bookingId and rating required");

  const booking = await prisma.booking.findUnique({ where: { id: body.bookingId } });
  if (!booking) return Response.json({ error: "Booking not found" }, { status: 404 });
  if (booking.customerId !== user.id) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (!booking.techId) return badRequest("Booking has no assigned tech");

  const review = await prisma.review.create({
    data: {
      bookingId: body.bookingId,
      customerId: user.id,
      techId: booking.techId,
      rating: body.rating,
      comment: body.comment ?? null,
      categories: body.categories ?? [],
    },
  });

  return Response.json(review, { status: 201 });
}
