import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, badRequest } from "@/lib/session";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  const invoices = await prisma.invoice.findMany({
    where: user.role === "tech" ? {} : { customerId: user.id },
    include: {
      booking: {
        include: {
          tasks: true,
          parts: true,
          home: true,
        },
      },
      customer: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(invoices);
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (user.role !== "tech") return Response.json({ error: "Only techs can create invoices" }, { status: 403 });

  const body = await req.json();
  if (!body.bookingId) return badRequest("bookingId required");

  const booking = await prisma.booking.findUnique({
    where: { id: body.bookingId },
    include: { parts: true },
  });
  if (!booking) return Response.json({ error: "Booking not found" }, { status: 404 });

  const subtotal = body.subtotal ?? Number(booking.estimatedCost ?? 0);
  const tax = body.tax ?? 0;
  const total = subtotal + tax;

  const count = await prisma.invoice.count();
  const number = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  const invoice = await prisma.invoice.create({
    data: {
      bookingId: body.bookingId,
      customerId: booking.customerId,
      number,
      subtotal,
      tax,
      total,
      status: body.status ?? "sent",
      sentAt: new Date(),
    },
  });

  return Response.json(invoice, { status: 201 });
}
