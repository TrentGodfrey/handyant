import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, notFound, forbidden } from "@/lib/session";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { booking: true },
  });
  if (!invoice) return notFound("Invoice not found");
  if (invoice.customerId !== user.id) return forbidden();

  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      paidAt: new Date(),
      status: "paid",
    },
  });

  if (invoice.booking.techId) {
    await prisma.notification.create({
      data: {
        userId: invoice.booking.techId,
        title: "Payment received",
        body: `Invoice ${invoice.number} has been paid`,
        type: "invoice",
        link: "/admin",
      },
    });
  }

  return Response.json(updated);
}
