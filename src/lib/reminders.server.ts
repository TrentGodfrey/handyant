import { prisma } from "@/lib/prisma";
import { sendActivityEmail } from "@/lib/activity-email";
import {
  addDaysToDateString,
  businessDateString,
  businessDateTimeToInstant,
  dateOnlyString,
  BUSINESS_TIME_ZONE,
} from "@/lib/booking-policy";
import { isUniqueConstraintError } from "@/lib/data-integrity";
import {
  isReminderDue,
  canRetryReminderDelivery,
  MAX_REMINDER_DELIVERY_ATTEMPTS,
  REMINDER_CLAIM_LEASE_MS,
  REMINDER_RETRY_DELAY_MS,
  normalizeAppointmentReminders,
  reminderIdempotencyKey,
  type AppointmentReminders,
} from "@/lib/reminders";

const ACTIVE_BOOKING_STATUSES = ["pending", "confirmed"] as const;
const MAX_LEAD_MINUTES = 4_320;
const DEFAULT_LOOKBACK_MINUTES = 30;
const DEFAULT_LOOKAHEAD_MINUTES = 5;

export interface DueReminder {
  userId: string;
  bookingId: string;
  leadTime: number;
  appointmentAt: Date;
  recipientName: string | null;
  recipientEmail: string;
  recipientRole: "customer" | "tech";
}

export interface ReminderProcessResult {
  due: number;
  sent: number;
  skipped: number;
  failed: number;
}

function appointmentInstant(scheduledDate: Date, scheduledTime: Date): Date | null {
  const date = dateOnlyString(scheduledDate);
  if (!date) return null;
  const time = `${String(scheduledTime.getUTCHours()).padStart(2, "0")}:${String(
    scheduledTime.getUTCMinutes(),
  ).padStart(2, "0")}`;
  return businessDateTimeToInstant(date, time);
}

function reminderCandidates(params: {
  customer: {
    id: string;
    name: string | null;
    email: string | null;
    appointmentReminders: unknown;
    notifyPrefs: unknown;
  };
  tech: {
    id: string;
    name: string | null;
    email: string | null;
    appointmentReminders: unknown;
    notifyPrefs: unknown;
    businessProfile: {
      appointmentReminders: unknown;
      notifyPrefs: unknown;
    } | null;
  } | null;
}): Array<{
  userId: string;
  recipientName: string | null;
  recipientEmail: string;
  recipientRole: "customer" | "tech";
  preferences: AppointmentReminders;
  notificationsEnabled: boolean;
}> {
  const out: Array<{
    userId: string;
    recipientName: string | null;
    recipientEmail: string;
    recipientRole: "customer" | "tech";
    preferences: AppointmentReminders;
    notificationsEnabled: boolean;
  }> = [];
  const notificationsEnabled = (raw: unknown) => {
    if (!raw || typeof raw !== "object") return true;
    const prefs = raw as Record<string, unknown>;
    return prefs.email !== false && prefs.jobReminders !== false;
  };
  if (params.customer.email) {
    out.push({
      userId: params.customer.id,
      recipientName: params.customer.name,
      recipientEmail: params.customer.email,
      recipientRole: "customer",
      preferences: normalizeAppointmentReminders(
        params.customer.appointmentReminders as Partial<AppointmentReminders> | null,
      ),
      notificationsEnabled: notificationsEnabled(params.customer.notifyPrefs),
    });
  }
  if (params.tech?.email) {
    out.push({
      userId: params.tech.id,
      recipientName: params.tech.name,
      recipientEmail: params.tech.email,
      recipientRole: "tech",
      preferences: normalizeAppointmentReminders(
        (params.tech.businessProfile?.appointmentReminders ??
          params.tech.appointmentReminders) as Partial<AppointmentReminders> | null,
      ),
      notificationsEnabled: notificationsEnabled(
        params.tech.businessProfile?.notifyPrefs ?? params.tech.notifyPrefs,
      ),
    });
  }
  return out;
}

/**
 * Find reminders in a narrow catch-up window. The database stores the date and
 * time as DFW wall-clock values, so they must be combined through the canonical
 * America/Chicago conversion rather than the server's local timezone.
 */
export async function getDueReminders(
  now = new Date(),
  options: { lookbackMinutes?: number; lookaheadMinutes?: number } = {},
): Promise<DueReminder[]> {
  const lookbackMinutes = options.lookbackMinutes ?? DEFAULT_LOOKBACK_MINUTES;
  const lookaheadMinutes = options.lookaheadMinutes ?? DEFAULT_LOOKAHEAD_MINUTES;
  const firstDate = businessDateString(now);
  const horizonDays = Math.ceil((MAX_LEAD_MINUTES + lookaheadMinutes) / 1_440) + 1;
  const lastDate = addDaysToDateString(firstDate, horizonDays);
  if (!lastDate) return [];

  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
      scheduledDate: {
        gte: new Date(`${firstDate}T00:00:00Z`),
        lte: new Date(`${lastDate}T00:00:00Z`),
      },
    },
    select: {
      id: true,
      scheduledDate: true,
      scheduledTime: true,
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          appointmentReminders: true,
          notifyPrefs: true,
        },
      },
      tech: {
        select: {
          id: true,
          name: true,
          email: true,
          appointmentReminders: true,
          notifyPrefs: true,
          businessProfile: {
            select: { appointmentReminders: true, notifyPrefs: true },
          },
        },
      },
    },
  });

  const due: DueReminder[] = [];
  for (const booking of bookings) {
    const appointmentAt = appointmentInstant(
      booking.scheduledDate,
      booking.scheduledTime,
    );
    if (!appointmentAt) continue;

    for (const recipient of reminderCandidates({
      customer: booking.customer,
      tech: booking.tech,
    })) {
      if (
        !recipient.notificationsEnabled ||
        !recipient.preferences.enabled ||
        !recipient.preferences.channels.email
      ) {
        continue;
      }
      for (const leadTime of recipient.preferences.leadTimes) {
        if (
          isReminderDue({
            appointmentAt,
            leadTime,
            now,
            lookbackMinutes,
            lookaheadMinutes,
          })
        ) {
          due.push({
            userId: recipient.userId,
            bookingId: booking.id,
            leadTime,
            appointmentAt,
            recipientName: recipient.recipientName,
            recipientEmail: recipient.recipientEmail,
            recipientRole: recipient.recipientRole,
          });
        }
      }
    }
  }
  return due;
}

function leadTimeLabel(minutes: number): string {
  if (minutes % 1_440 === 0) {
    const days = minutes / 1_440;
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  return `${minutes} minutes`;
}

function appointmentLabel(appointmentAt: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(appointmentAt);
}

/**
 * Claim each reminder in Postgres before sending. The unique delivery ledger
 * prevents overlapping timers from sending twice, while the same stable key is
 * also passed to Resend for provider-level idempotency.
 */
export async function processDueEmailReminders(
  now = new Date(),
): Promise<ReminderProcessResult> {
  const due = await getDueReminders(now);
  const result: ReminderProcessResult = {
    due: due.length,
    sent: 0,
    skipped: 0,
    failed: 0,
  };

  for (const reminder of due) {
    let delivery: { id: string };
    try {
      delivery = await prisma.reminderDelivery.create({
        data: {
          bookingId: reminder.bookingId,
          userId: reminder.userId,
          leadTimeMinutes: reminder.leadTime,
          channel: "email",
          appointmentAt: reminder.appointmentAt,
          attemptCount: 1,
        },
        select: { id: true },
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;

      const existing = await prisma.reminderDelivery.findFirst({
        where: {
          bookingId: reminder.bookingId,
          userId: reminder.userId,
          leadTimeMinutes: reminder.leadTime,
          channel: "email",
          appointmentAt: reminder.appointmentAt,
        },
        select: {
          id: true,
          sentAt: true,
          failedAt: true,
          claimedAt: true,
          attemptCount: true,
        },
      });
      if (
        !existing ||
        !canRetryReminderDelivery({
          sentAt: existing.sentAt,
          failedAt: existing.failedAt,
          claimedAt: existing.claimedAt,
          attemptCount: existing.attemptCount,
          now,
        })
      ) {
        result.skipped += 1;
        continue;
      }

      // Reclaim a failed attempt or an abandoned claim. updateMany makes the
      // lease acquisition atomic when overlapping timers see the same row.
      const reclaimed = await prisma.reminderDelivery.updateMany({
        where: {
          id: existing.id,
          sentAt: null,
          attemptCount: { lt: MAX_REMINDER_DELIVERY_ATTEMPTS },
          OR: [
            {
              failedAt: {
                lte: new Date(now.getTime() - REMINDER_RETRY_DELAY_MS),
              },
            },
            {
              claimedAt: {
                lte: new Date(now.getTime() - REMINDER_CLAIM_LEASE_MS),
              },
            },
          ],
        },
        data: {
          claimedAt: now,
          failedAt: null,
          error: null,
          attemptCount: { increment: 1 },
        },
      });
      if (reclaimed.count !== 1) {
        result.skipped += 1;
        continue;
      }
      delivery = { id: existing.id };
    }

    // Re-read immediately before delivery so a cancellation or reschedule that
    // raced the initial query does not produce a stale reminder.
    const current = await prisma.booking.findFirst({
      where: {
        id: reminder.bookingId,
        status: { in: [...ACTIVE_BOOKING_STATUSES] },
      },
      select: { scheduledDate: true, scheduledTime: true },
    });
    const currentAppointment = current
      ? appointmentInstant(current.scheduledDate, current.scheduledTime)
      : null;
    if (
      !currentAppointment ||
      currentAppointment.getTime() !== reminder.appointmentAt.getTime()
    ) {
      await prisma.reminderDelivery.update({
        where: { id: delivery.id },
        data: {
          failedAt: new Date(),
          error: "Booking was cancelled or rescheduled before delivery",
        },
      });
      result.skipped += 1;
      continue;
    }

    try {
      const deliveryResult = await sendActivityEmail({
        to: reminder.recipientEmail,
        recipientName: reminder.recipientName,
        subject: "Reminder: your upcoming MCQ visit",
        heading: "Your MCQ visit is coming up",
        message: `Your visit is scheduled for ${appointmentLabel(
          reminder.appointmentAt,
        )}, about ${leadTimeLabel(reminder.leadTime)} from now.`,
        actionPath:
          reminder.recipientRole === "tech"
            ? `/jobs/${reminder.bookingId}`
            : "/home",
        actionLabel: "View visit",
        idempotencyKey: reminderIdempotencyKey(reminder),
      });
      if (deliveryResult.ok) {
        await prisma.reminderDelivery.update({
          where: { id: delivery.id },
          data: {
            sentAt: new Date(),
            providerMessageId: deliveryResult.id ?? null,
          },
        });
        result.sent += 1;
      } else {
        await prisma.reminderDelivery.update({
          where: { id: delivery.id },
          data: {
            failedAt: new Date(),
            error: (deliveryResult.error ?? "Email delivery failed").slice(0, 500),
          },
        });
        result.failed += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown reminder error";
      await prisma.reminderDelivery.update({
        where: { id: delivery.id },
        data: { failedAt: new Date(), error: message.slice(0, 500) },
      });
      result.failed += 1;
    }
  }

  return result;
}
