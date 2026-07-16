import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, notFound, forbidden, badRequest } from "@/lib/session";
import { isSquareCheckoutConfigured, squareRequest } from "@/lib/square";
import { rateLimited, takeRateLimit } from "@/lib/rate-limit";

interface CreatePaymentLinkResponse {
  payment_link?: { id?: string; order_id?: string; url?: string };
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const limit = takeRateLimit(`invoice-checkout:${user.id}`, 10, 10 * 60 * 1000);
  if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);
  const { id } = await ctx.params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { customer: { select: { email: true } } },
  });
  if (!invoice) return notFound("Invoice not found");
  if (invoice.customerId !== user.id) return forbidden();
  if (invoice.status === "paid" || invoice.paidAt) return badRequest("Invoice is already paid");
  if (invoice.status === "draft" || invoice.status === "cancelled") return badRequest("Invoice is not payable");
  if (!isSquareCheckoutConfigured()) {
    return Response.json({ error: "Online payment is being configured. Please message Anthony." }, { status: 503 });
  }

  const amountCents = Math.round(Number(invoice.total) * 100);
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) return badRequest("Invoice total is invalid");
  const idempotencyKey = randomUUID();
  const checkout = await prisma.paymentCheckout.create({
    data: {
      customerId: user.id,
      invoiceId: invoice.id,
      kind: "invoice",
      amountCents,
      idempotencyKey,
    },
  });

  try {
    const baseUrl = (process.env.NEXTAUTH_URL ?? req.nextUrl.origin).replace(/\/$/, "");
    const result = await squareRequest<CreatePaymentLinkResponse>("/v2/online-checkout/payment-links", {
      method: "POST",
      body: JSON.stringify({
        idempotency_key: idempotencyKey,
        description: `MCQ invoice ${invoice.number}`,
        order: {
          location_id: process.env.SQUARE_LOCATION_ID,
          reference_id: checkout.id,
          line_items: [{
            name: `MCQ Property Care - ${invoice.number}`,
            quantity: "1",
            base_price_money: { amount: amountCents, currency: "USD" },
          }],
        },
        checkout_options: {
          allow_tipping: false,
          redirect_url: `${baseUrl}/account/receipts?checkout=processing`,
          merchant_support_email: process.env.MERCHANT_SUPPORT_EMAIL,
        },
        pre_populated_data: invoice.customer.email ? { buyer_email: invoice.customer.email } : undefined,
        payment_note: `MCQ invoice checkout ${checkout.id}`,
      }),
    });
    const paymentLink = result.payment_link;
    if (!paymentLink?.id || !paymentLink.order_id || !paymentLink.url) {
      throw new Error("Square did not return a usable checkout link");
    }
    await prisma.paymentCheckout.update({
      where: { id: checkout.id },
      data: { squarePaymentLinkId: paymentLink.id, squareOrderId: paymentLink.order_id },
    });
    return Response.json({ checkoutUrl: paymentLink.url });
  } catch (error) {
    await prisma.paymentCheckout.update({ where: { id: checkout.id }, data: { status: "failed" } });
    console.error("[invoice-checkout] create payment link failed", error);
    return Response.json({ error: "Square checkout is temporarily unavailable." }, { status: 502 });
  }
}
