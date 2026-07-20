import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, forbidden } from "@/lib/session";
import { sendActivityEmail } from "@/lib/activity-email";

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

  const result = await prisma.subscription.updateMany({
    where: { customerId: user.id, status: "active" },
    data: { status: "cancelled", endsAt: new Date() },
  });

  if (result.count > 0) {
    const tech = await prisma.user.findFirst({
      where: { role: "tech", email: { not: null } },
      orderBy: { createdAt: "asc" },
      select: { name: true, email: true },
    });
    await sendActivityEmail({
      to: tech?.email,
      recipientName: tech?.name,
      subject: `Membership cancelled by ${user.name}`,
      heading: "Membership cancellation",
      message: `${user.name} cancelled their MCQ membership.`,
      actionPath: "/admin-clients",
      actionLabel: "View customers",
    });
    await sendActivityEmail({
      to: user.email,
      recipientName: user.name,
      subject: "Your MCQ membership was cancelled",
      heading: "Membership cancelled",
      message: "Your MCQ membership has been cancelled. Contact Anthony if this was unexpected.",
      actionPath: "/messages?topic=membership",
      actionLabel: "Contact MCQ",
    });
  }

  return Response.json({ ok: true });
}
