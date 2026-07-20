// Server-only reminder helpers. Pulled out of `./reminders.ts` so client
// components can import the shared types/constants without dragging the
// Postgres driver into the browser bundle.
//
// TODO: invoke `getDueReminders` from a cron / scheduled task once SMS + email
// scheduling is in place. The function does not record what's been sent —
// callers should wrap it with a `sent_reminders` table to avoid duplicates.

import { prisma } from "@/lib/prisma";
import {
  normalizeAppointmentReminders,
  type AppointmentReminders,
  type ReminderChannels,
} from "@/lib/reminders";

export interface DueReminder {
  userId: string;
  bookingId: string;
  leadTime: number;
  channels: ReminderChannels;
  /** Combined scheduled date+time for the booking, as a Date. */
  appointmentAt: Date;
}

/**
 * Returns reminders that should fire roughly within the window
 * `[now, now + windowMinutes)`. The window guards against the cron job missing
 * a fire because it ran late.
 *
 * Pulls every upcoming booking with a tech and/or customer who has reminders
 * enabled, then materialises one DueReminder per lead-time match.
 */
export async function getDueReminders(
  now: Date,
  windowMinutes = 5,
): Promise<DueReminder[]> {
  const windowEnd = new Date(now.getTime() + windowMinutes * 60_000);
  // Max lead is 3 days; only look that far ahead.
  const maxLeadMs = 4320 * 60_000;
  const horizon = new Date(now.getTime() + maxLeadMs + windowMinutes * 60_000);

  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: ["pending", "confirmed"] },
      scheduledDate: { gte: now, lte: horizon },
    },
    select: {
      id: true,
      customerId: true,
      techId: true,
      scheduledDate: true,
      scheduledTime: true,
    },
  });

  if (bookings.length === 0) return [];

  // Collect user IDs we'll need prefs for.
  const userIds = new Set<string>();
  for (const b of bookings) {
    userIds.add(b.customerId);
    if (b.techId) userIds.add(b.techId);
  }

  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(userIds) } },
    select: { id: true, appointmentReminders: true },
  });
  const prefsById = new Map(
    users.map((u) => [
      u.id,
      normalizeAppointmentReminders(
        u.appointmentReminders as Partial<AppointmentReminders> | null,
      ),
    ]),
  );

  const out: DueReminder[] = [];
  for (const b of bookings) {
    const appointmentAt = combineDateAndTime(b.scheduledDate, b.scheduledTime);
    if (!appointmentAt) continue;

    const candidates: Array<{ userId: string }> = [{ userId: b.customerId }];
    if (b.techId) candidates.push({ userId: b.techId });

    for (const { userId } of candidates) {
      const prefs = prefsById.get(userId);
      if (!prefs || !prefs.enabled || prefs.leadTimes.length === 0) continue;

      for (const leadTime of prefs.leadTimes) {
        const fireAt = new Date(appointmentAt.getTime() - leadTime * 60_000);
        if (fireAt >= now && fireAt < windowEnd) {
          out.push({
            userId,
            bookingId: b.id,
            leadTime,
            channels: prefs.channels,
            appointmentAt,
          });
        }
      }
    }
  }

  return out;
}

/**
 * Combine a date-only and time-only column (both from Postgres) into a single
 * JS Date. Returns null if either is unusable. Treats date/time as already in
 * the app's local zone since that's how bookings are stored.
 */
function combineDateAndTime(date: Date, time: Date): Date | null {
  if (!(date instanceof Date) || !(time instanceof Date)) return null;
  if (Number.isNaN(date.getTime()) || Number.isNaN(time.getTime())) return null;
  const out = new Date(date);
  out.setHours(time.getUTCHours(), time.getUTCMinutes(), time.getUTCSeconds(), 0);
  return out;
}
