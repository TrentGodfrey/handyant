import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTech, unauthorized } from "@/lib/session";

export async function GET(req: NextRequest) {
  const tech = await requireTech();
  if (!tech) return unauthorized();

  const search = req.nextUrl.searchParams.get("q")?.toLowerCase();

  const homes = await prisma.home.findMany({
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          avatarUrl: true,
          subscriptions: { where: { status: "active" }, take: 1 },
        },
      },
      bookings: {
        select: {
          id: true,
          status: true,
          scheduledDate: true,
          tasks: { select: { done: true } },
        },
        orderBy: { scheduledDate: "desc" },
      },
      photos: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const enriched = homes.map((h) => {
    const lastVisit = h.bookings.find((b) => b.status === "completed")?.scheduledDate ?? null;
    const openTasks = h.bookings
      .filter((b) => b.status !== "completed" && b.status !== "cancelled")
      .reduce((acc, b) => acc + b.tasks.filter((t) => !t.done).length, 0);
    const totalVisits = h.bookings.filter((b) => b.status === "completed").length;
    const subscriptionType = h.customer.subscriptions.length > 0
      ? h.customer.subscriptions[0].plan
      : null;
    return {
      ...h,
      lastVisit,
      openTasks,
      totalVisits,
      subscriptionType,
    };
  });

  const filtered = search
    ? enriched.filter(
        (h) =>
          h.customer.name.toLowerCase().includes(search) ||
          h.address.toLowerCase().includes(search) ||
          (h.city ?? "").toLowerCase().includes(search)
      )
    : enriched;

  return Response.json(filtered);
}
