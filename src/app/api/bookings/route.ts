import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized } from "@/lib/session";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  const bookings = await prisma.booking.findMany({
    where: user.role === "tech" ? { techId: user.id } : { customerId: user.id },
    include: {
      home: true,
      customer: { select: { id: true, name: true, phone: true, avatarUrl: true } },
      tech: { select: { id: true, name: true, phone: true, avatarUrl: true } },
      categories: { include: { category: true } },
      tasks: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { scheduledDate: "desc" },
  });

  return Response.json(bookings);
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const body = await req.json();

  const isTechCreating = user.role === "tech" && typeof body.customerId === "string" && body.customerId.length > 0;
  const customerId = isTechCreating ? (body.customerId as string) : user.id;

  // Normalize parts payload - accept string[] of items, drop blanks.
  const partItems: string[] = Array.isArray(body.parts)
    ? (body.parts as unknown[])
        .filter((p): p is string => typeof p === "string")
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
    : [];

  const booking = await prisma.booking.create({
    data: {
      customerId,
      techId: isTechCreating ? user.id : null,
      homeId: body.homeId ?? null,
      scheduledDate: new Date(body.scheduledDate),
      scheduledTime: new Date(`1970-01-01T${body.scheduledTime}`),
      description: body.description ?? null,
      customerNotes: body.customerNotes ?? null,
      durationMinutes: body.durationMinutes ?? 120,
      serviceType: body.serviceType ?? "one_time",
      status: isTechCreating ? "confirmed" : "pending",
      categories: body.categoryIds?.length
        ? {
            create: body.categoryIds.map((categoryId: string) => ({
              categoryId,
            })),
          }
        : undefined,
      parts: partItems.length
        ? {
            create: partItems.map((item) => ({ item })),
          }
        : undefined,
    },
    include: {
      home: true,
      categories: { include: { category: true } },
      parts: true,
    },
  });

  return Response.json(booking, { status: 201 });
}
