import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, notFound, forbidden, badRequest } from "@/lib/session";
import { rateLimited, takeRateLimit } from "@/lib/rate-limit";
import { isPartsBuyer } from "@/lib/parts-status";

const PART_STATUSES = ["needed", "ordered", "purchased"] as const;

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const part = await prisma.part.findUnique({
    where: { id },
    include: { booking: { select: { techId: true } } },
  });
  if (!part) return notFound("Part not found");

  const isAssignedTech =
    user.role === "tech" && (user.isAdmin || part.booking.techId === user.id);
  if (!isAssignedTech) return forbidden();

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return badRequest("Invalid request body");
  }
  const limit = takeRateLimit(`booking-part-update:${user.id}`, 180, 60 * 60 * 1000);
  if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);

  const data: Record<string, unknown> = {};
  if (body.status !== undefined) {
    if (!PART_STATUSES.includes(body.status)) {
      return badRequest("Part status must be needed, ordered, or purchased");
    }
    data.status = body.status;
  }
  if (body.buyer !== undefined) {
    if (body.buyer !== null && !isPartsBuyer(body.buyer)) {
      return badRequest("Parts buyer must be customer or tech");
    }
    data.buyer = body.buyer;
  }
  if (Object.keys(data).length === 0) {
    return badRequest("No valid part updates were provided");
  }

  const updated = await prisma.part.update({ where: { id }, data });
  return Response.json(updated);
}
