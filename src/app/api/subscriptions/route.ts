import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  forbidden,
  notFound,
  requireUser,
  unauthorized,
} from "@/lib/session";
import { sendActivityEmail } from "@/lib/activity-email";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  const subs = await prisma.subscription.findMany({
    where: { customerId: user.id },
    include: {
      home: {
        select: {
          id: true,
          address: true,
          city: true,
          state: true,
          zip: true,
        },
      },
    },
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

export async function DELETE(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const subscriptionId = req.nextUrl.searchParams.get("subscriptionId")?.trim();
  if (!subscriptionId) return badRequest("subscriptionId is required");

  const subscription = await prisma.subscription.findFirst({
    where: {
      id: subscriptionId,
      customerId: user.id,
      status: "active",
    },
    include: {
      home: {
        select: {
          address: true,
          city: true,
          state: true,
          zip: true,
        },
      },
    },
  });
  if (!subscription) return notFound("Active subscription not found");

  // Scope the mutation to the selected active membership as well as the
  // authenticated customer. This prevents one home's cancellation control
  // from cancelling every membership on a multi-home account.
  const result = await prisma.subscription.updateMany({
    where: {
      id: subscription.id,
      customerId: user.id,
      status: "active",
    },
    data: { status: "cancelled", endsAt: new Date() },
  });
  if (result.count === 0) return notFound("Active subscription not found");

  const homeLabel = subscription.home
    ? [
        subscription.home.address,
        subscription.home.city,
        subscription.home.state,
        subscription.home.zip,
      ].filter(Boolean).join(", ")
    : "your account";
  const tech = await prisma.user.findFirst({
    where: { role: "tech", email: { not: null } },
    orderBy: [{ isAdmin: "desc" }, { createdAt: "asc" }],
    select: { name: true, email: true },
  });
  await sendActivityEmail({
    to: tech?.email,
    recipientName: tech?.name,
    subject: `Membership cancelled by ${user.name}`,
    heading: "Membership cancellation",
    message: `${user.name} immediately cancelled the MCQ membership for ${homeLabel}.`,
    actionPath: "/people",
    actionLabel: "View customers",
  });
  await sendActivityEmail({
    to: user.email,
    recipientName: user.name,
    subject: "Your MCQ membership was cancelled",
    heading: "Membership cancelled",
    message: `Your MCQ membership for ${homeLabel} has ended immediately. Contact Anthony if this was unexpected.`,
    actionPath: "/messages?topic=membership",
    actionLabel: "Contact MCQ",
  });

  return Response.json({ ok: true, subscriptionId: subscription.id });
}
