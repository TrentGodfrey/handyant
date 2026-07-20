import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidSquareWebhookSignature, squareWebhookUrl } from "@/lib/square";
import { sendActivityEmail } from "@/lib/activity-email";
import { planMeta } from "@/lib/plans";

interface SquarePaymentEvent {
  event_id?: string;
  type?: string;
  data?: {
    object?: {
      payment?: {
        id?: string;
        order_id?: string;
        status?: string;
        amount_money?: { amount?: number; currency?: string };
        total_money?: { amount?: number; currency?: string };
        created_at?: string;
      };
    };
  };
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-square-hmacsha256-signature") ?? "";
  const notificationUrl = squareWebhookUrl((process.env.NEXTAUTH_URL ?? req.nextUrl.origin));
  if (!isValidSquareWebhookSignature({ rawBody, signature, notificationUrl })) {
    return Response.json({ error: "Invalid signature" }, { status: 403 });
  }

  let event: SquarePaymentEvent;
  try {
    event = JSON.parse(rawBody) as SquarePaymentEvent;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!event.event_id || !event.type) return Response.json({ error: "Invalid event" }, { status: 400 });

  const alreadyProcessed = await prisma.squareWebhookEvent.findUnique({ where: { eventId: event.event_id } });
  if (alreadyProcessed) return Response.json({ ok: true, duplicate: true });

  const payment = event.data?.object?.payment;
  const payloadHash = createHash("sha256").update(rawBody).digest("hex");
  const isPaymentEvent = event.type === "payment.created" || event.type === "payment.updated";

  if (!isPaymentEvent || !payment?.order_id) {
    await prisma.squareWebhookEvent.create({ data: { eventId: event.event_id, type: event.type, payloadHash } });
    return Response.json({ ok: true, ignored: true });
  }

  const checkout = await prisma.paymentCheckout.findUnique({
    where: { squareOrderId: payment.order_id },
    include: { customer: { select: { name: true, email: true } } },
  });
  if (!checkout) {
    await prisma.squareWebhookEvent.create({ data: { eventId: event.event_id, type: event.type, payloadHash } });
    return Response.json({ ok: true, ignored: true });
  }

  const money = payment.amount_money ?? payment.total_money;
  const paidAt = payment.created_at ? new Date(payment.created_at) : new Date();
  const validAmount = money?.amount === checkout.amountCents && money.currency === checkout.currency;

  let completedKind: "membership" | "invoice" | null = null;
  await prisma.$transaction(async (tx) => {
    await tx.squareWebhookEvent.create({ data: { eventId: event.event_id!, type: event.type!, payloadHash } });
    if (payment.status !== "COMPLETED" || !validAmount || !payment.id || checkout.status === "paid") return;

    const markedPaid = await tx.paymentCheckout.updateMany({
      where: { id: checkout.id, status: { not: "paid" } },
      data: { status: "paid", squarePaymentId: payment.id, paidAt },
    });
    if (markedPaid.count !== 1) return;

    if (checkout.kind === "membership" && checkout.homeId && checkout.plan) {
      await tx.subscription.updateMany({
        where: { homeId: checkout.homeId, status: "active" },
        data: { status: "cancelled", endsAt: paidAt },
      });
      const endsAt = new Date(paidAt);
      endsAt.setUTCFullYear(endsAt.getUTCFullYear() + 1);
      await tx.subscription.create({
        data: {
          customerId: checkout.customerId,
          homeId: checkout.homeId,
          plan: checkout.plan,
          status: "active",
          visitsUsed: 0,
          startedAt: paidAt,
          endsAt,
        },
      });
      completedKind = "membership";
    } else if (checkout.kind === "invoice" && checkout.invoiceId) {
      const invoice = await tx.invoice.update({
        where: { id: checkout.invoiceId },
        data: { status: "paid", paidAt },
        include: { booking: { select: { techId: true } } },
      });
      if (invoice.booking.techId) {
        await tx.notification.create({
          data: {
            userId: invoice.booking.techId,
            title: "Payment received",
            body: `Invoice ${invoice.number} was paid through Square`,
            type: "invoice",
            link: `/jobs/${invoice.bookingId}`,
          },
        });
      }
      completedKind = "invoice";
    }
  });

  if (completedKind === "membership" && checkout.plan) {
    await sendActivityEmail({
      to: checkout.customer.email,
      recipientName: checkout.customer.name,
      subject: `Welcome to MCQ ${planMeta(checkout.plan).label}`,
      heading: "Membership activated",
      message: `Your payment was received and your ${planMeta(checkout.plan).label} membership is now active.`,
      actionPath: "/account",
      actionLabel: "View membership",
    });
    const tech = await prisma.user.findFirst({
      where: { role: "tech", email: { not: null } },
      orderBy: { createdAt: "asc" },
      select: { name: true, email: true },
    });
    await sendActivityEmail({
      to: tech?.email,
      recipientName: tech?.name,
      subject: `New ${planMeta(checkout.plan).label} membership — ${checkout.customer.name}`,
      heading: "New membership",
      message: `${checkout.customer.name} completed payment for an MCQ ${planMeta(checkout.plan).label} membership.`,
      actionPath: "/admin-clients",
      actionLabel: "View customer",
    });
  }

  return Response.json({ ok: true });
}
