import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTech, unauthorized } from "@/lib/session";

type Period = "week" | "month" | "quarter" | "year";

function parsePeriod(raw: string | null): Period {
  if (raw === "week" || raw === "month" || raw === "quarter" || raw === "year") {
    return raw;
  }
  return "month";
}

function periodBounds(period: Period, now: Date) {
  // Returns { currentStart, currentEnd, priorStart, priorEnd } where:
  //  - currentEnd is exclusive (= now's start-of-period + length)
  //  - priorEnd === currentStart, priorStart === currentStart - length
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  if (period === "week") {
    const currentStart = new Date(startOfDay);
    currentStart.setDate(currentStart.getDate() - currentStart.getDay());
    const currentEnd = new Date(currentStart);
    currentEnd.setDate(currentEnd.getDate() + 7);
    const priorStart = new Date(currentStart);
    priorStart.setDate(priorStart.getDate() - 7);
    return { currentStart, currentEnd, priorStart, priorEnd: currentStart };
  }
  if (period === "quarter") {
    const qIndex = Math.floor(now.getMonth() / 3);
    const currentStart = new Date(now.getFullYear(), qIndex * 3, 1);
    const currentEnd = new Date(now.getFullYear(), qIndex * 3 + 3, 1);
    const priorStart = new Date(now.getFullYear(), qIndex * 3 - 3, 1);
    return { currentStart, currentEnd, priorStart, priorEnd: currentStart };
  }
  if (period === "year") {
    const currentStart = new Date(now.getFullYear(), 0, 1);
    const currentEnd = new Date(now.getFullYear() + 1, 0, 1);
    const priorStart = new Date(now.getFullYear() - 1, 0, 1);
    return { currentStart, currentEnd, priorStart, priorEnd: currentStart };
  }
  // month (default)
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const priorStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { currentStart, currentEnd, priorStart, priorEnd: currentStart };
}

type BookingForMetrics = {
  customerId: string;
  status: string;
  finalCost: { toString(): string } | null;
  estimatedCost: { toString(): string } | null;
};

function metricsFor(bookings: BookingForMetrics[]) {
  const completed = bookings.filter((b) => b.status === "completed");
  const revenue = completed.reduce((acc, b) => {
    const cost = b.finalCost ?? b.estimatedCost;
    return acc + (cost ? Number(cost.toString()) : 0);
  }, 0);
  const jobsCompleted = completed.length;
  const avgJobValue = jobsCompleted > 0 ? revenue / jobsCompleted : 0;
  const activeCustomers = new Set(bookings.map((b) => b.customerId)).size;
  return { revenue, jobsCompleted, avgJobValue, activeCustomers };
}

function trend(current: number, prior: number) {
  const deltaAbs = current - prior;
  const deltaPct = prior > 0 ? (deltaAbs / prior) * 100 : current > 0 ? 100 : 0;
  let direction: "up" | "down" | "flat";
  if (Math.abs(deltaPct) < 1) direction = "flat";
  else if (deltaAbs > 0) direction = "up";
  else direction = "down";
  return {
    current,
    prior,
    deltaAbs,
    deltaPct,
    direction,
  };
}

export async function GET(req: NextRequest) {
  const tech = await requireTech();
  if (!tech) return unauthorized();

  const period = parsePeriod(req.nextUrl.searchParams.get("period"));

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

  const ninetyDaysAgo = new Date(startOfDay);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // 8 week buckets ending in current week
  const eightWeeksAgoStart = new Date(startOfWeek);
  eightWeeksAgoStart.setDate(eightWeeksAgoStart.getDate() - 7 * 7);

  // Period boundaries (current vs prior)
  const { currentStart, currentEnd, priorStart, priorEnd } = periodBounds(
    period,
    now
  );

  const [
    todayBookings,
    weekBookings,
    monthBookings,
    partsNeeded,
    allReviews,
    completedForRevenue,
    pendingOffers,
    recentBookings,
    currentPeriodBookings,
    priorPeriodBookings,
  ] = await Promise.all([
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
    prisma.booking.findMany({
      where: {
        techId: tech.id,
        status: "completed",
        scheduledDate: { gte: eightWeeksAgoStart, lt: endOfWeek },
      },
      select: { scheduledDate: true, finalCost: true, estimatedCost: true },
    }),
    prisma.booking.findMany({
      where: {
        status: "pending",
        OR: [{ techId: null }, { techId: tech.id }],
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        home: { select: { address: true, city: true, state: true, zip: true } },
        categories: { include: { category: true } },
      },
      orderBy: { scheduledDate: "asc" },
    }),
    prisma.booking.findMany({
      where: {
        techId: tech.id,
        scheduledDate: { gte: ninetyDaysAgo },
      },
      include: {
        customer: { select: { id: true, name: true, avatarUrl: true } },
        categories: { include: { category: { select: { name: true } } } },
      },
    }),
    prisma.booking.findMany({
      where: {
        techId: tech.id,
        scheduledDate: { gte: currentStart, lt: currentEnd },
      },
      select: {
        customerId: true,
        status: true,
        finalCost: true,
        estimatedCost: true,
      },
    }),
    prisma.booking.findMany({
      where: {
        techId: tech.id,
        scheduledDate: { gte: priorStart, lt: priorEnd },
      },
      select: {
        customerId: true,
        status: true,
        finalCost: true,
        estimatedCost: true,
      },
    }),
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

  // Build weekly revenue buckets (last 8 weeks, ascending)
  const weeklyRevenue: { weekStart: string; revenue: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const wkStart = new Date(startOfWeek);
    wkStart.setDate(wkStart.getDate() - 7 * i);
    const wkEnd = new Date(wkStart);
    wkEnd.setDate(wkEnd.getDate() + 7);
    const revenue = completedForRevenue
      .filter((b) => {
        const d = new Date(b.scheduledDate);
        return d >= wkStart && d < wkEnd;
      })
      .reduce((acc, b) => {
        const cost = b.finalCost ?? b.estimatedCost;
        return acc + (cost ? Number(cost.toString()) : 0);
      }, 0);
    weeklyRevenue.push({
      weekStart: wkStart.toISOString().slice(0, 10),
      revenue,
    });
  }

  // Top clients (by booking count, last 90 days)
  const clientCounts = new Map<
    string,
    { id: string; name: string; avatarUrl: string | null; count: number; revenue: number }
  >();
  for (const b of recentBookings) {
    const c = b.customer;
    const entry = clientCounts.get(c.id) ?? {
      id: c.id,
      name: c.name,
      avatarUrl: c.avatarUrl,
      count: 0,
      revenue: 0,
    };
    entry.count += 1;
    const cost = b.finalCost ?? b.estimatedCost;
    entry.revenue += cost ? Number(cost.toString()) : 0;
    clientCounts.set(c.id, entry);
  }
  const topClients = [...clientCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Revenue by category, last 90 days
  const categoryRevenue = new Map<string, number>();
  for (const b of recentBookings) {
    const cost = b.finalCost ?? b.estimatedCost;
    const amount = cost ? Number(cost.toString()) : 0;
    if (!amount) continue;
    if (b.categories.length === 0) {
      categoryRevenue.set("Uncategorized", (categoryRevenue.get("Uncategorized") ?? 0) + amount);
      continue;
    }
    const split = amount / b.categories.length;
    for (const c of b.categories) {
      const name = c.category.name;
      categoryRevenue.set(name, (categoryRevenue.get(name) ?? 0) + split);
    }
  }
  const revenueByCategory = [...categoryRevenue.entries()]
    .map(([category, revenue]) => ({ category, revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  // Period-over-period
  const currentMetrics = metricsFor(currentPeriodBookings);
  const priorMetrics = metricsFor(priorPeriodBookings);
  const trends = {
    revenue: trend(currentMetrics.revenue, priorMetrics.revenue),
    jobsCompleted: trend(currentMetrics.jobsCompleted, priorMetrics.jobsCompleted),
    avgJobValue: trend(currentMetrics.avgJobValue, priorMetrics.avgJobValue),
    activeCustomers: trend(currentMetrics.activeCustomers, priorMetrics.activeCustomers),
  };

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
    weeklyRevenue,
    pendingOffers: pendingOffers.map((b) => ({
      id: b.id,
      customerId: b.customerId,
      customerName: b.customer.name,
      customerPhone: b.customer.phone,
      address: b.home
        ? [b.home.address, b.home.city, b.home.state, b.home.zip].filter(Boolean).join(", ")
        : null,
      scheduledDate: b.scheduledDate,
      scheduledTime: b.scheduledTime,
      description: b.description,
      estimatedCost: b.estimatedCost,
      categories: b.categories.map((c) => c.category.name),
    })),
    topClients,
    revenueByCategory,
    period: {
      key: period,
      currentStart: currentStart.toISOString(),
      currentEnd: currentEnd.toISOString(),
      priorStart: priorStart.toISOString(),
      priorEnd: priorEnd.toISOString(),
      current: currentMetrics,
      prior: priorMetrics,
      trends,
    },
  });
}
