import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { clampVisitsUsed, isMembershipPlan } from "@/lib/subscription-usage";
import { badRequest, notFound, requireTech, unauthorized } from "@/lib/session";

function oneYearFromNow() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date;
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tech = await requireTech();
  if (!tech) return unauthorized();

  const { id: homeId } = await ctx.params;
  const home = await prisma.home.findUnique({ where: { id: homeId } });
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

  return Response.json(subscription, { status: existing ? 200 : 201 });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tech = await requireTech();
  if (!tech) return unauthorized();

  const { id: homeId } = await ctx.params;
  const result = await prisma.subscription.updateMany({
    where: { homeId, status: "active" },
    data: { status: "cancelled", endsAt: new Date() },
  });

  if (result.count === 0) return notFound("Active subscription not found");
  return Response.json({ ok: true });
}
