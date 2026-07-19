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

  const [todayBookings, weekBookings, monthBookings, partsNeeded, allReviews, pendingOffers] = await Promise.all([
    prisma.booking.findMany({
      where: { techId: tech.id, scheduledDate: { gte: startOfDay, lt: endOfDay } },
      include: {
        tasks: true,
        parts: true,
        customer: { select: { name: true } },
        home: { select: { address: true, city: true } },
      },
      orderBy: { scheduledTime: "asc" },
    }),
    prisma.booking.findMany({
      where: { techId: tech.id, scheduledDate: { gte: startOfWeek, lt: endOfWeek } },
      select: { durationMinutes: true },
    }),
    prisma.booking.findMany({
      where: { techId: tech.id, scheduledDate: { gte: startOfMonth, lt: endOfMonth } },
      include: { tasks: true },
    }),
    prisma.part.findMany({
      where: {
        status: "needed",
        booking: {
          techId: tech.id,
          status: { in: ["pending", "confirmed"] },
          scheduledDate: { gte: startOfDay },
        },
      },
      include: { booking: { include: { customer: true } } },
    }),
    prisma.review.findMany({
      where: { techId: tech.id, createdAt: { gte: startOfMonth, lt: endOfMonth } },
      select: { rating: true },
    }),
    prisma.booking.findMany({
      where: { status: "pending", OR: [{ techId: null }, { techId: tech.id }] },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        home: { select: { address: true, city: true, state: true, zip: true } },
        categories: { include: { category: true } },
      },
      orderBy: { scheduledDate: "asc" },
    }),
  ]);

  const sumMinutes = (list: { durationMinutes: number | null }[]) =>
    list.reduce((total, booking) => total + (booking.durationMinutes ?? 0), 0);
  const completedThisMonth = monthBookings.filter((booking) => booking.status === "completed");
  const tasksThisMonth = completedThisMonth.reduce((total, booking) => total + booking.tasks.length, 0);
  const avgRating = allReviews.length
    ? allReviews.reduce((total, review) => total + review.rating, 0) / allReviews.length
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
