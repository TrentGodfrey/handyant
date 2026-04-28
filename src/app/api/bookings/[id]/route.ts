import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, notFound, forbidden, badRequest } from "@/lib/session";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      home: true,
      customer: { select: { id: true, name: true, phone: true, email: true, avatarUrl: true } },
      tech: { select: { id: true, name: true, phone: true, avatarUrl: true } },
      categories: { include: { category: true } },
      tasks: { orderBy: { sortOrder: "asc" } },
      parts: true,
      photos: true,
      reviews: true,
      invoices: true,
    },
  });

  if (!booking) return notFound("Booking not found");

  const isCustomerOwner = booking.customerId === user.id;
  const isAssignedTech = user.role === "tech" && booking.techId === user.id;
  if (!isCustomerOwner && !isAssignedTech) return forbidden();

  return Response.json(booking);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing) return notFound("Booking not found");

  const isCustomer = existing.customerId === user.id;
  const isTech = user.role === "tech" && existing.techId === user.id;
  if (!isCustomer && !isTech) return forbidden();

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (isTech) {
      data.status = body.status;
    } else if (isCustomer) {
      // Customers may only cancel their own bookings.
      if (body.status !== "cancelled") {
        return badRequest("Customers may only set status to 'cancelled'");
      }
      data.status = "cancelled";
    }
  }
  if (body.techId !== undefined && isTech) data.techId = body.techId;
  if (body.scheduledDate !== undefined) data.scheduledDate = new Date(body.scheduledDate);
  if (body.scheduledTime !== undefined) data.scheduledTime = new Date(`1970-01-01T${body.scheduledTime}`);
  if (body.durationMinutes !== undefined) data.durationMinutes = body.durationMinutes;
  if (body.description !== undefined) data.description = body.description;
  if (body.customerNotes !== undefined && isCustomer) data.customerNotes = body.customerNotes;
  if (body.techNotes !== undefined && isTech) data.techNotes = body.techNotes;
  if (body.estimatedCost !== undefined && isTech) data.estimatedCost = body.estimatedCost;
  if (body.finalCost !== undefined && isTech) data.finalCost = body.finalCost;

  const booking = await prisma.booking.update({
    where: { id },
    data,
    include: {
      home: true,
      customer: { select: { id: true, name: true, phone: true, avatarUrl: true } },
      tech: { select: { id: true, name: true, phone: true, avatarUrl: true } },
      tasks: { orderBy: { sortOrder: "asc" } },
    },
  });

  return Response.json(booking);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing) return notFound("Booking not found");
  const isCustomer = existing.customerId === user.id;
  const isTech = user.role === "tech" && existing.techId === user.id;
  if (!isCustomer && !isTech) return forbidden();

  await prisma.booking.update({ where: { id }, data: { status: "cancelled" } });
  return Response.json({ ok: true });
}
