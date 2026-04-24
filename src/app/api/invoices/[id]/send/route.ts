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

  const isOwningTech = user.role === "tech" && invoice.booking.techId === user.id;
  if (!isOwningTech && user.role !== "tech") return forbidden();
  // Allow any tech (admin) — owning tech preferred but role:"tech" is admin role here.

  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      sentAt: new Date(),
      status: "sent",
    },
  });

  await prisma.notification.create({
    data: {
      userId: invoice.customerId,
      title: "Invoice ready",
      body: `Invoice ${invoice.number} is ready to view`,
      type: "invoice",
      link: "/account/receipts",
    },
  });

  return Response.json(updated);
}
