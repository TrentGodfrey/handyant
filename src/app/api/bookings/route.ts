import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).id as string;
  const role = (session.user as Record<string, unknown>).role as string;

  const bookings = await prisma.booking.findMany({
    where: role === "tech" ? { techId: userId } : { customerId: userId },
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
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).id as string;
  const role = (session.user as Record<string, unknown>).role as string;
  const body = await req.json();

  const isTechCreating = role === "tech" && typeof body.customerId === "string" && body.customerId.length > 0;
  const customerId = isTechCreating ? (body.customerId as string) : userId;

  // Normalize parts payload — accept string[] of items, drop blanks.
  const partItems: string[] = Array.isArray(body.parts)
    ? (body.parts as unknown[])
        .filter((p): p is string => typeof p === "string")
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
    : [];

  const booking = await prisma.booking.create({
    data: {
      customerId,
      techId: isTechCreating ? userId : null,
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
