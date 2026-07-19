import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { clampVisitsUsed, isMembershipPlan } from "@/lib/subscription-usage";
import { badRequest, notFound, requireTech, unauthorized } from "@/lib/session";
import { sendActivityEmail } from "@/lib/activity-email";
import { planMeta } from "@/lib/plans";

function oneYearFromNow() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date;
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tech = await requireTech();
  if (!tech) return unauthorized();

  const { id: homeId } = await ctx.params;
  const home = await prisma.home.findUnique({
    where: { id: homeId },
    include: { customer: { select: { name: true, email: true } } },
  });
  if (!home) return notFound("Home not found");

  const body = await req.json();
  if (!isMembershipPlan(body.plan)) return badRequest("Invalid subscription plan");

  const visitsUsed = clampVisitsUsed(body.visitsUsed ?? 0, body.plan);
  const existing = await prisma.subscription.findFirst({
    where: {
      customerId: home.customerId,
      status: "active",
      OR: [{ homeId }, { homeId: null }],
    },
    orderBy: { startedAt: "desc" },
  });

  const subscription = existing
    ? await prisma.subscription.update({
        where: { id: existing.id },
        data: { homeId, plan: body.plan, visitsUsed },
      })
    : await prisma.subscription.create({
        data: {
          customerId: home.customerId,
          homeId,
          plan: body.plan,
          status: "active",
          visitsUsed,
          endsAt: oneYearFromNow(),
        },
      });

  await sendActivityEmail({
    to: home.customer.email,
    recipientName: home.customer.name,
    subject: `Your MCQ ${planMeta(body.plan).label} membership is active`,
    heading: "Membership updated",
    message: `Your ${planMeta(body.plan).label} membership is active with ${visitsUsed} visit${visitsUsed === 1 ? "" : "s"} used.`,
    actionPath: "/account",
    actionLabel: "View membership",
  });

  return Response.json(subscription, { status: existing ? 200 : 201 });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tech = await requireTech();
  if (!tech) return unauthorized();

  const { id: homeId } = await ctx.params;
  const home = await prisma.home.findUnique({
    where: { id: homeId },
    include: { customer: { select: { name: true, email: true } } },
  });
  if (!home) return notFound("Home not found");
  const result = await prisma.subscription.updateMany({
    where: { homeId, status: "active" },
    data: { status: "cancelled", endsAt: new Date() },
  });

  if (result.count === 0) return notFound("Active subscription not found");
  await sendActivityEmail({
    to: home.customer.email,
    recipientName: home.customer.name,
    subject: "Your MCQ membership was cancelled",
    heading: "Membership cancelled",
    message: "Your MCQ membership has been cancelled. Contact Anthony if this was unexpected.",
    actionPath: "/messages?topic=membership",
    actionLabel: "Contact MCQ",
  });
  return Response.json({ ok: true });
}
