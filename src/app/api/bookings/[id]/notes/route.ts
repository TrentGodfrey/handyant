import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, notFound, forbidden, badRequest } from "@/lib/session";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return notFound("Booking not found");

  const isCustomerOwner = booking.customerId === user.id;
  const isAssignedTech = user.role === "tech" && booking.techId === user.id;
  if (!isCustomerOwner && !isAssignedTech) return forbidden();

  const notes = await prisma.bookingNote.findMany({
    where: { bookingId: id },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(notes);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (user.role !== "tech") return forbidden();
  const { id } = await ctx.params;

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return notFound("Booking not found");

  const body = await req.json();
  if (!body.text || typeof body.text !== "string" || body.text.trim().length === 0) {
    return badRequest("text required");
  }

  const note = await prisma.bookingNote.create({
    data: {
      bookingId: id,
      authorId: user.id,
      text: body.text.trim(),
    },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
    },
  });
  return Response.json(note, { status: 201 });
}
