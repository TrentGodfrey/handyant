import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized } from "@/lib/session";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  const subs = await prisma.subscription.findMany({
    where: { customerId: user.id },
    orderBy: { startedAt: "desc" },
  });

  return Response.json(subs);
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const body = await req.json();
  const plan = body.plan ?? "free";

  // TODO: integrate Stripe before allowing customer upgrades
  // For now, customers can only set themselves to the free tier. Promotion to
  // pro/premium must come from a tech-side endpoint or a future Stripe webhook.
  if (user.role !== "tech" && plan !== "free") {
    return Response.json(
      { error: "Paid plans are not yet available - Stripe integration pending" },
      { status: 403 }
    );
  }

  await prisma.subscription.updateMany({
    where: { customerId: user.id, status: "active" },
    data: { status: "cancelled", endsAt: new Date() },
  });

  const sub = await prisma.subscription.create({
    data: {
      customerId: user.id,
      plan,
      status: "active",
    },
  });

  return Response.json(sub, { status: 201 });
}

export async function DELETE() {
  const user = await requireUser();
  if (!user) return unauthorized();

  await prisma.subscription.updateMany({
    where: { customerId: user.id, status: "active" },
    data: { status: "cancelled", endsAt: new Date() },
  });

  return Response.json({ ok: true });
}
