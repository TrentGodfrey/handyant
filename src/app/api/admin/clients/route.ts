import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTech, unauthorized } from "@/lib/session";
import { SubscriptionPlan } from "@/generated/prisma/enums";

export async function GET(req: NextRequest) {
  const tech = await requireTech();
  if (!tech) return unauthorized();

  const search = req.nextUrl.searchParams.get("q")?.toLowerCase();

  const clients = await prisma.user.findMany({
    where: { role: "customer" },
    include: {
      homes: { take: 1 },
      subscriptions: { where: { status: "active" }, take: 1 },
      bookingsAsCustomer: {
        select: { id: true, status: true, scheduledDate: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const enriched = clients.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    avatarUrl: c.avatarUrl,
    primaryHome: c.homes[0] ?? null,
    subscription: c.subscriptions[0] ?? null,
    bookingCount: c.bookingsAsCustomer.length,
    lastBooking: c.bookingsAsCustomer.sort(
      (a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
    )[0] ?? null,
  }));

  const filtered = search
    ? enriched.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          (c.email ?? "").toLowerCase().includes(search) ||
          (c.phone ?? "").includes(search)
      )
    : enriched;

  return Response.json(filtered);
}

export async function POST(req: NextRequest) {
  const tech = await requireTech();
  if (!tech) return unauthorized();

  const body = await req.json();
  if (!body.name) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const plan = body.plan as SubscriptionPlan | null | undefined;
  if (plan != null && !Object.values(SubscriptionPlan).includes(plan)) {
    return Response.json({ error: "Invalid subscription plan" }, { status: 400 });
  }

  // Dedupe by email or phone - return existing customer rather than creating
  // a duplicate User row (techs frequently re-add a client they've forgotten).
  const dedupeOr: Array<Record<string, unknown>> = [];
  if (body.email) dedupeOr.push({ email: body.email });
  if (body.phone) dedupeOr.push({ phone: body.phone });

  let client = dedupeOr.length
    ? await prisma.user.findFirst({
        where: { role: "customer", OR: dedupeOr },
      })
    : null;

  if (!client) {
    client = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email ?? null,
        phone: body.phone ?? null,
        role: "customer",
      },
    });
  }

  let home = null;
  if (body.address) {
    home = await prisma.home.create({
      data: {
        customerId: client.id,
        address: body.address,
        city: body.city ?? null,
        state: body.state ?? "TX",
        zip: body.zip ?? null,
        notes: body.notes ?? null,
        gateCode: body.gateCode ?? null,
        yearBuilt: body.yearBuilt ?? null,
      },
    });
  }

  if (plan) {
    const activeSubscription = await prisma.subscription.findFirst({
      where: { customerId: client.id, status: "active" },
      orderBy: { startedAt: "desc" },
    });
    if (activeSubscription) {
      await prisma.subscription.update({
        where: { id: activeSubscription.id },
        data: { plan },
      });
    } else {
      await prisma.subscription.create({ data: { customerId: client.id, plan } });
    }
  }

  return Response.json({ client, home }, { status: 201 });
}
