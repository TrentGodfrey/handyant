import { prisma } from "@/lib/prisma";
import { requireTech, unauthorized } from "@/lib/session";

export async function GET() {
  const tech = await requireTech();
  if (!tech) return unauthorized();

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [todayBookings, weekBookings, monthBookings, partsNeeded, allReviews] = await Promise.all([
    prisma.booking.findMany({
      where: { scheduledDate: { gte: startOfDay, lt: endOfDay } },
      include: {
        tasks: true,
        parts: true,
        customer: { select: { name: true } },
        home: { select: { address: true, city: true } },
      },
      orderBy: { scheduledTime: "asc" },
    }),
    prisma.booking.findMany({
      where: { scheduledDate: { gte: startOfWeek, lt: endOfWeek } },
      include: { tasks: true },
    }),
    prisma.booking.findMany({
      where: { scheduledDate: { gte: startOfMonth, lt: endOfMonth } },
      include: { tasks: true },
    }),
    prisma.part.findMany({
      where: { status: "needed", booking: { status: { not: "completed" } } },
      include: { booking: { include: { customer: true } } },
    }),
    prisma.review.findMany({ select: { rating: true, createdAt: true } }),
  ]);

  const sumMinutes = (list: { durationMinutes: number | null }[]) =>
    list.reduce((acc, b) => acc + (b.durationMinutes ?? 0), 0);

  const sumRevenue = (list: { finalCost: { toString(): string } | null; estimatedCost: { toString(): string } | null }[]) =>
    list.reduce((acc, b) => {
      const cost = b.finalCost ?? b.estimatedCost;
      return acc + (cost ? Number(cost.toString()) : 0);
    }, 0);

  const completedThisMonth = monthBookings.filter((b) => b.status === "completed");
  const tasksThisMonth = completedThisMonth.reduce((acc, b) => acc + b.tasks.length, 0);

  const recentReviews = allReviews
    .filter((r) => new Date(r.createdAt!) >= startOfMonth)
    .map((r) => r.rating);
  const avgRating = recentReviews.length
    ? recentReviews.reduce((a, b) => a + b, 0) / recentReviews.length
    : 0;

  return Response.json({
    today: {
      jobs: todayBookings.length,
      hours: sumMinutes(todayBookings) / 60,
      partsToBuy: partsNeeded.length,
      schedule: todayBookings,
    },
    week: {
      jobs: weekBookings.length,
      hours: sumMinutes(weekBookings) / 60,
      revenue: sumRevenue(weekBookings),
    },
    month: {
      jobs: monthBookings.length,
      completed: completedThisMonth.length,
      revenue: sumRevenue(completedThisMonth),
      tasksPerVisit: completedThisMonth.length ? tasksThisMonth / completedThisMonth.length : 0,
      avgRating,
      reviewCount: recentReviews.length,
    },
    partsNeeded: partsNeeded.map((p) => ({
      id: p.id,
      item: p.item,
      qty: p.qty,
      bookingId: p.bookingId,
      client: p.booking.customer.name,
    })),
  });
}
