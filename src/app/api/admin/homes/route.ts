import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTech, unauthorized } from "@/lib/session";
import { homeRosterWhere } from "@/lib/resource-access";
import { countOpenHomeTodos } from "@/lib/home-todo-status";

export async function GET(req: NextRequest) {
  const tech = await requireTech();
  if (!tech) return unauthorized();

  const search = req.nextUrl.searchParams.get("q")?.toLowerCase();

  const homes = await prisma.home.findMany({
    where: homeRosterWhere(tech),
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          avatarUrl: true,
        },
      },
      subscriptions: {
        where: { status: "active" },
        orderBy: { startedAt: "desc" },
        take: 1,
      },
      bookings: {
        where: tech.isAdmin ? {} : { techId: tech.id },
        select: {
          id: true,
          status: true,
          scheduledDate: true,
        },
        orderBy: { scheduledDate: "desc" },
      },
      todos: {
        select: { status: true },
      },
      photos: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const enriched = homes.map((h) => {
    const { todos, ...home } = h;
    const lastVisit = home.bookings.find((b) => b.status === "completed")?.scheduledDate ?? null;
    const openTasks = countOpenHomeTodos(todos);
    const totalVisits = home.bookings.filter((b) => b.status === "completed").length;
    const activeSubscription = home.subscriptions[0] ?? null;
    return {
      ...home,
      lastVisit,
      openTasks,
      totalVisits,
      subscriptionType: activeSubscription?.plan ?? null,
      visitsUsed: activeSubscription?.visitsUsed ?? 0,
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
