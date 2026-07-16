import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, forbidden } from "@/lib/session";

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
  void req;
  // Memberships are activated only by the signed Square webhook or the
  // explicit staff-side home subscription editor.
  return forbidden();
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
