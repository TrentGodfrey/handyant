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
  const body = await req.json();

  const booking = await prisma.booking.create({
    data: {
      customerId: userId,
      homeId: body.homeId ?? null,
      scheduledDate: new Date(body.scheduledDate),
      scheduledTime: new Date(`1970-01-01T${body.scheduledTime}`),
      description: body.description ?? null,
      customerNotes: body.customerNotes ?? null,
      durationMinutes: body.durationMinutes ?? 120,
      serviceType: body.serviceType ?? "one_time",
      categories: body.categoryIds?.length
        ? {
            create: body.categoryIds.map((categoryId: string) => ({
              categoryId,
            })),
          }
        : undefined,
    },
    include: {
      home: true,
      categories: { include: { category: true } },
    },
  });

  return Response.json(booking, { status: 201 });
}
