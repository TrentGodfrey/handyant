import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTech, unauthorized } from "@/lib/session";

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

  const client = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email ?? null,
      phone: body.phone ?? null,
      role: "customer",
    },
  });

  if (body.address) {
    await prisma.home.create({
      data: {
        customerId: client.id,
        address: body.address,
        city: body.city ?? null,
        state: body.state ?? "TX",
        zip: body.zip ?? null,
        notes: body.notes ?? null,
        gateCode: body.gateCode ?? null,
      },
    });
  }

  return Response.json(client, { status: 201 });
}
