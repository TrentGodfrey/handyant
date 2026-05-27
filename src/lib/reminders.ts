// Pure types, constants, and normalizer for appointment reminders.
//
// IMPORTANT: This file is imported by client components — keep it free of any
// server-only modules (no prisma, no `next/headers`, no node:* imports). The
// cron-side helper that actually queries bookings lives in `./reminders.server`.

// ── Types & defaults ──────────────────────────────────────────────────────────

export interface ReminderChannels {
  sms: boolean;
  email: boolean;
  push: boolean;
}

export interface AppointmentReminders {
  enabled: boolean;
  /** Minutes-before-appointment to notify. Stored sorted descending. */
  leadTimes: number[];
  channels: ReminderChannels;
}

export const REMINDER_LEAD_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 4320, label: "3 days before" },
  { value: 1440, label: "1 day before" },
  { value: 180, label: "3 hours before" },
  { value: 60, label: "1 hour before" },
  { value: 30, label: "30 minutes before" },
  { value: 15, label: "15 minutes before" },
];

export const ALLOWED_LEAD_TIMES: Set<number> = new Set(
  REMINDER_LEAD_OPTIONS.map((o) => o.value),
);

export const DEFAULT_APPOINTMENT_REMINDERS: AppointmentReminders = {
  enabled: true,
  leadTimes: [1440, 60],
  channels: { email: true, sms: false, push: true },
};

/**
 * Coerce any stored JSON blob into a well-formed AppointmentReminders. Silently
 * drops unknown lead times and missing channel keys. Always safe to call with
 * `null`, `undefined`, or a partial object - never throws.
 */
export function normalizeAppointmentReminders(
  raw: Partial<AppointmentReminders> | null | undefined,
): AppointmentReminders {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_APPOINTMENT_REMINDERS };

  const enabled =
    typeof raw.enabled === "boolean" ? raw.enabled : DEFAULT_APPOINTMENT_REMINDERS.enabled;

  const leadTimes = Array.isArray(raw.leadTimes)
    ? Array.from(
        new Set(
          (raw.leadTimes as unknown[])
            .map((v) => Number(v))
            .filter((n) => Number.isFinite(n) && ALLOWED_LEAD_TIMES.has(n)),
        ),
      ).sort((a, b) => b - a)
    : [...DEFAULT_APPOINTMENT_REMINDERS.leadTimes];

  const ch = (raw.channels ?? {}) as Partial<ReminderChannels>;
  const channels: ReminderChannels = {
    sms: typeof ch.sms === "boolean" ? ch.sms : DEFAULT_APPOINTMENT_REMINDERS.channels.sms,
    email: typeof ch.email === "boolean" ? ch.email : DEFAULT_APPOINTMENT_REMINDERS.channels.email,
    push: typeof ch.push === "boolean" ? ch.push : DEFAULT_APPOINTMENT_REMINDERS.channels.push,
  };

  return { enabled, leadTimes, channels };
}
