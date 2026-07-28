import { prisma } from "@/lib/prisma";
import { requireTech, unauthorized } from "@/lib/session";
import { sumBookedMinutes } from "@/lib/booking-stats";
import {
  addDaysToDateString,
  businessDateString,
  businessDateTimeToInstant,
} from "@/lib/booking-policy";
import {
  bookingDateParts,
  bookingDateToDatabaseDate,
} from "@/lib/booking-time";

export async function GET() {
  const tech = await requireTech();
  if (!tech) return unauthorized();

  const now = new Date();
  const today = businessDateString(now);
  const todayParts = bookingDateParts(today)!;
  const tomorrow = addDaysToDateString(today, 1)!;
  const weekday = new Date(
    Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day),
  ).getUTCDay();
  const weekStart = addDaysToDateString(today, -weekday)!;
  const weekEnd = addDaysToDateString(weekStart, 7)!;
  const monthStart = `${today.slice(0, 7)}-01`;
  const nextMonthValue = new Date(
    Date.UTC(todayParts.year, todayParts.month, 1),
  );
  const monthEnd = nextMonthValue.toISOString().slice(0, 10);
  const startOfDay = bookingDateToDatabaseDate(today)!;
  const endOfDay = bookingDateToDatabaseDate(tomorrow)!;
  const startOfWeek = bookingDateToDatabaseDate(weekStart)!;
  const endOfWeek = bookingDateToDatabaseDate(weekEnd)!;
  const startOfMonth = bookingDateToDatabaseDate(monthStart)!;
  const endOfMonth = bookingDateToDatabaseDate(monthEnd)!;
  const reviewMonthStart = businessDateTimeToInstant(monthStart, "00:00")!;
  const reviewMonthEnd = businessDateTimeToInstant(monthEnd, "00:00")!;

  const [todayBookings, weekBookings, monthBookings, partsNeeded, allReviews, pendingOffers] = await Promise.all([
    prisma.booking.findMany({
      where: {
        techId: tech.id,
        status: { not: "cancelled" },
        scheduledDate: { gte: startOfDay, lt: endOfDay },
      },
      include: {
        tasks: true,
        parts: true,
        customer: { select: { name: true } },
        home: { select: { address: true, city: true } },
      },
      orderBy: { scheduledTime: "asc" },
    }),
    prisma.booking.findMany({
      where: {
        techId: tech.id,
        status: { not: "cancelled" },
        scheduledDate: { gte: startOfWeek, lt: endOfWeek },
      },
      select: { status: true, durationMinutes: true },
    }),
    prisma.booking.findMany({
      where: {
        techId: tech.id,
        status: { not: "cancelled" },
        scheduledDate: { gte: startOfMonth, lt: endOfMonth },
      },
      include: { tasks: true },
    }),
    prisma.part.findMany({
      where: {
        status: "needed",
        // Parts the homeowner is buying are not on Anthony's shopping list.
        OR: [{ buyer: null }, { buyer: { not: "customer" } }],
        booking: {
          techId: tech.id,
          status: { in: ["pending", "confirmed"] },
          scheduledDate: { gte: startOfDay },
        },
      },
      include: { booking: { include: { customer: true } } },
    }),
    prisma.review.findMany({
      where: {
        techId: tech.id,
        createdAt: { gte: reviewMonthStart, lt: reviewMonthEnd },
      },
      select: { rating: true },
    }),
    prisma.booking.findMany({
      where: {
        status: "pending",
        OR: [{ techId: null }, { techId: tech.id }],
        ...(tech.isAdmin
          ? {}
          : { declines: { none: { techId: tech.id } } }),
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        home: { select: { address: true, city: true, state: true, zip: true } },
        categories: { include: { category: true } },
      },
      orderBy: { scheduledDate: "asc" },
    }),
  ]);

  const completedThisMonth = monthBookings.filter((booking) => booking.status === "completed");
  const tasksThisMonth = completedThisMonth.reduce((total, booking) => total + booking.tasks.length, 0);
  const avgRating = allReviews.length
    ? allReviews.reduce((total, review) => total + review.rating, 0) / allReviews.length
    : 0;

  return Response.json({
    today: {
      jobs: todayBookings.length,
      hours: sumBookedMinutes(todayBookings) / 60,
      partsToBuy: partsNeeded.length,
      schedule: todayBookings,
    },
    week: {
      jobs: weekBookings.length,
      hours: sumBookedMinutes(weekBookings) / 60,
    },
    month: {
      jobs: monthBookings.length,
      completed: completedThisMonth.length,
      tasksPerVisit: completedThisMonth.length ? tasksThisMonth / completedThisMonth.length : 0,
      avgRating,
      reviewCount: allReviews.length,
    },
    partsNeeded: partsNeeded.map((part) => ({
      id: part.id,
      item: part.item,
      qty: part.qty,
      bookingId: part.bookingId,
      client: part.booking.customer.name,
    })),
    pendingOffers: pendingOffers.map((booking) => ({
      id: booking.id,
      customerId: booking.customerId,
      customerName: booking.customer.name,
      customerPhone: booking.customer.phone,
      address: booking.home
        ? [booking.home.address, booking.home.city, booking.home.state, booking.home.zip].filter(Boolean).join(", ")
        : null,
      scheduledDate: booking.scheduledDate,
      scheduledTime: booking.scheduledTime,
      description: booking.description,
      categories: booking.categories.map((category) => category.category.name),
    })),
  });
}
