import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized } from "@/lib/session";
import { sendEmail, emailShell, escapeHtml } from "@/lib/email";
import { decryptHomeAccess } from "@/lib/sensitive-data";
import { bookingTimeToDatabaseDate } from "@/lib/booking-time";
import { bookingListWhere } from "@/lib/booking-view";

export async function GET(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const bookings = await prisma.booking.findMany({
    where: bookingListWhere(user, req.nextUrl.searchParams.get("view")),
    include: {
      home: true,
      customer: { select: { id: true, name: true, phone: true, avatarUrl: true } },
      tech: { select: { id: true, name: true, phone: true, avatarUrl: true } },
      categories: { include: { category: true } },
      tasks: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { scheduledDate: "desc" },
  });

  return Response.json(bookings.map((booking) => ({
    ...booking,
    techNotes: user.role === "tech" ? booking.techNotes : null,
    home: booking.home ? decryptHomeAccess(booking.home) : null,
  })));
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const body = await req.json();

  const isTechCreating = user.role === "tech" && typeof body.customerId === "string" && body.customerId.length > 0;
  const customerId = isTechCreating ? (body.customerId as string) : user.id;

  // A technician can intentionally open the customer-side UI to run a real
  // end-to-end booking for a home attached to their own account. In that one
  // preview case the user still has the "tech" database role, so requiring a
  // customer role produced the misleading "Customer not found" error.
  const isTechCustomerPreview = user.role === "tech" && !isTechCreating && customerId === user.id;
  const customer = await prisma.user.findFirst({
    where: { id: customerId, ...(isTechCustomerPreview ? {} : { role: "customer" }) },
    select: { id: true },
  });
  if (!customer) return Response.json({ error: "Customer not found" }, { status: 404 });
  if (typeof body.homeId === "string" && body.homeId) {
    const ownedHome = await prisma.home.findFirst({ where: { id: body.homeId, customerId }, select: { id: true } });
    if (!ownedHome) return Response.json({ error: "Home does not belong to this customer" }, { status: 403 });
  }
  const scheduledDate = new Date(body.scheduledDate);
  const scheduledTime = typeof body.scheduledTime === "string" ? bookingTimeToDatabaseDate(body.scheduledTime) : null;
  if (!body.scheduledDate || Number.isNaN(scheduledDate.getTime())) {
    return Response.json({ error: "A valid scheduled date is required" }, { status: 400 });
  }
  if (!scheduledTime) {
    return Response.json({ error: "A valid scheduled time is required" }, { status: 400 });
  }

  // Auto-assign a tech for customer-created bookings. For now there's a single
  // default tech (Anthony); pick the earliest tech in the system. If none
  // exists, leave techId null (admin will assign manually).
  let assignedTechId: string | null = null;
  if (isTechCreating) {
    assignedTechId = user.id;
  } else {
    const defaultTech = await prisma.user.findFirst({
      where: { role: "tech" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    assignedTechId = defaultTech?.id ?? null;
  }

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
      techId: assignedTechId,
      homeId: body.homeId ?? null,
      scheduledDate,
      scheduledTime,
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

  // Notify the assigned tech for customer-created bookings only - techs
  // booking on behalf of a customer obviously already know.
  if (!isTechCreating && assignedTechId) {
    try {
      const [customer, tech] = await Promise.all([
        prisma.user.findUnique({
          where: { id: customerId },
          select: { name: true },
        }),
        prisma.user.findUnique({
          where: { id: assignedTechId },
          select: { email: true, name: true },
        }),
      ]);

      const customerName = customer?.name ?? "A customer";
      const dateLabel = booking.scheduledDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const timeLabel = booking.scheduledTime.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
      });

      // In-app notification linked to the tech's job detail page.
      await prisma.notification.create({
        data: {
          userId: assignedTechId,
          title: "New booking request",
          body: `${customerName} requested a visit on ${dateLabel} at ${timeLabel}`,
          type: "booking",
          link: `/jobs/${booking.id}`,
        },
      });

      // Email Anthony (fire-and-forget; sendEmail degrades gracefully if not configured).
      if (tech?.email) {
        const baseUrl = process.env.NEXTAUTH_URL ?? "";
        const jobUrl = `${baseUrl.replace(/\/$/, "")}/jobs/${booking.id}`;
        const subject = `New booking from ${customerName}`;
        const html = emailShell({
          preheader: `New booking on ${dateLabel} at ${timeLabel}`,
          contentHtml: `
            <p style="margin:0 0 12px 0;font-size:16px;font-weight:600;color:#1a1a1a;">New booking request</p>
            <p style="margin:0 0 16px 0;">
              <strong>${escapeHtml(customerName)}</strong> just booked a visit on
              <strong>${escapeHtml(dateLabel)}</strong> at <strong>${escapeHtml(timeLabel)}</strong>.
            </p>
            <p style="margin:24px 0 0 0;">
              <a href="${escapeHtml(jobUrl)}" style="display:inline-block;background-color:#4F9598;color:#ffffff;text-decoration:none;font-weight:600;padding:10px 18px;border-radius:8px;font-size:14px;">View booking</a>
            </p>
          `,
        });
        const text = `New booking from ${customerName} on ${dateLabel} at ${timeLabel}. View at: ${jobUrl}`;
        // Don't await - keep the POST response fast; sendEmail logs its own errors.
        void sendEmail({ to: tech.email, subject, html, text });
      }
    } catch (err) {
      // Notification failures must not break booking creation.
      console.error("[bookings] failed to notify tech of new booking", err);
    }
  }

  return Response.json({
    ...booking,
    home: booking.home ? decryptHomeAccess(booking.home) : null,
  }, { status: 201 });
}
