import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTech, unauthorized } from "@/lib/session";

/**
 * Lightweight customer roster for the admin /people page.
 * The richer /api/admin/clients endpoint includes subscription + last booking
 * details - this one returns just the aggregate counts the People list needs.
 */
export async function GET(req: NextRequest) {
  const tech = await requireTech();
  if (!tech) return unauthorized();

  const search = req.nextUrl.searchParams.get("q")?.toLowerCase().trim() ?? "";

  const customers = await prisma.user.findMany({
    where: { role: "customer" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      createdAt: true,
      homes: { select: { id: true }, take: 1 },
      _count: { select: { homes: true, bookingsAsCustomer: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const enriched = customers.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    avatarUrl: c.avatarUrl,
    createdAt: c.createdAt,
    primaryHomeId: c.homes[0]?.id ?? null,
    _count: {
      homes: c._count.homes,
      bookings: c._count.bookingsAsCustomer,
    },
  }));

  if (!search) return Response.json(enriched);

  const filtered = enriched.filter(
    (c) =>
      c.name.toLowerCase().includes(search) ||
      (c.email ?? "").toLowerCase().includes(search) ||
      (c.phone ?? "").includes(search)
  );
  return Response.json(filtered);
}
