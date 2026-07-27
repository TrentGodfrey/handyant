import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, badRequest, verificationRequired } from "@/lib/session";
import { rateLimited, takeRateLimit } from "@/lib/rate-limit";
import { isUniqueConstraintError } from "@/lib/data-integrity";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  const where: Record<string, unknown> = user.role === "tech"
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
  if (user.role === "customer" && !user.emailVerified) return verificationRequired();
  const limit = takeRateLimit(`review:${user.id}`, 10, 24 * 60 * 60 * 1000);
  if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);

  const body = await req.json();
  const rating = Number(body.rating);
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";
  const rawCategories: unknown[] = Array.isArray(body.categories) ? body.categories : [];
  const categories = rawCategories.filter(
    (value: unknown): value is string => typeof value === "string",
  );
  if (!body.bookingId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return badRequest("bookingId and a rating from 1 to 5 are required");
  }
  if (comment.length > 2_000) return badRequest("Review comment is too long");
  if (categories.length > 10 || categories.some((value) => value.length > 50)) {
    return badRequest("Review categories are invalid");
  }

  const booking = await prisma.booking.findUnique({ where: { id: body.bookingId } });
  if (!booking) return Response.json({ error: "Booking not found" }, { status: 404 });
  if (booking.customerId !== user.id) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (!booking.techId) return badRequest("Booking has no assigned tech");
  if (booking.status !== "completed") {
    return badRequest("Can only review completed bookings");
  }

  // Enforce one review per (booking, customer).
  const existing = await prisma.review.findFirst({
    where: { bookingId: body.bookingId, customerId: user.id },
    select: { id: true },
  });
  if (existing) {
    return Response.json(
      { error: "You have already reviewed this booking" },
      { status: 409 }
    );
  }

  let review;
  try {
    review = await prisma.review.create({
      data: {
        bookingId: body.bookingId,
        customerId: user.id,
        techId: booking.techId,
        rating,
        comment: comment || null,
        categories,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return Response.json(
        { error: "You have already reviewed this booking" },
        { status: 409 },
      );
    }
    throw error;
  }

  return Response.json(review, { status: 201 });
}
