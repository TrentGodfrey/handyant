import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, forbidden, badRequest, notFound } from "@/lib/session";
import { PLANS, type PlanId } from "@/lib/plans";
import { isSquareCheckoutConfigured, squareRequest } from "@/lib/square";
import { rateLimited, takeRateLimit } from "@/lib/rate-limit";

interface CreatePaymentLinkResponse {
  payment_link?: { id?: string; order_id?: string; url?: string };
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (user.role !== "customer") return forbidden();
  const limit = takeRateLimit(`membership-checkout:${user.id}`, 5, 10 * 60 * 1000);
  if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);
  if (!isSquareCheckoutConfigured()) {
    return Response.json(
      { error: "Online membership checkout is being configured. Please message Anthony to activate." },
      { status: 503 },
    );
  }

  const body = (await req.json()) as { plan?: string; homeId?: string };
  const plan = PLANS.find((candidate) => candidate.id === body.plan);
  if (!plan) return badRequest("Choose a valid membership plan");

  const home = body.homeId
    ? await prisma.home.findFirst({ where: { id: body.homeId, customerId: user.id } })
    : await prisma.home.findFirst({ where: { customerId: user.id }, orderBy: { createdAt: "asc" } });
  if (!home) return notFound("Add a home before purchasing a membership");

  const idempotencyKey = randomUUID();
  const checkout = await prisma.paymentCheckout.create({
    data: {
      customerId: user.id,
      homeId: home.id,
      plan: plan.id as PlanId,
      amountCents: plan.annualPrice * 100,
      idempotencyKey,
    },
  });

  try {
    const baseUrl = (process.env.NEXTAUTH_URL ?? req.nextUrl.origin).replace(/\/$/, "");
    const result = await squareRequest<CreatePaymentLinkResponse>("/v2/online-checkout/payment-links", {
      method: "POST",
      body: JSON.stringify({
        idempotency_key: idempotencyKey,
        description: `MCQ ${plan.label} annual membership`,
        order: {
          location_id: process.env.SQUARE_LOCATION_ID,
          reference_id: checkout.id,
          line_items: [
            {
              name: `MCQ ${plan.label} Annual Membership`,
              quantity: "1",
              base_price_money: { amount: plan.annualPrice * 100, currency: "USD" },
            },
          ],
        },
        checkout_options: {
          allow_tipping: false,
          redirect_url: `${baseUrl}/account/plans?checkout=processing`,
          merchant_support_email: process.env.MERCHANT_SUPPORT_EMAIL,
        },
        pre_populated_data: user.email ? { buyer_email: user.email } : undefined,
        payment_note: `MCQ membership checkout ${checkout.id}`,
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
    return Response.json({ checkoutUrl: paymentLink.url, checkoutId: checkout.id });
  } catch (error) {
    await prisma.paymentCheckout.update({ where: { id: checkout.id }, data: { status: "failed" } });
    console.error("[square-checkout] create payment link failed", error);
    return Response.json(
      { error: "Square checkout is temporarily unavailable. Please try again or message Anthony." },
      { status: 502 },
    );
  }
}
