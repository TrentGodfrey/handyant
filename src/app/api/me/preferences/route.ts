import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized } from "@/lib/session";
import {
  DEFAULT_APPOINTMENT_REMINDERS,
  normalizeAppointmentReminders,
  type AppointmentReminders,
} from "@/lib/reminders";
import type { Prisma } from "@/generated/prisma/client";

const DEFAULT_PREFS = {
  jobReminders: true,
  promos: false,
  sms: true,
  email: true,
};

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { notifyPrefs: true, appointmentReminders: true },
  });

  const prefs = {
    ...DEFAULT_PREFS,
    ...((record?.notifyPrefs as Record<string, unknown> | null) ?? {}),
    appointmentReminders: normalizeAppointmentReminders(
      record?.appointmentReminders as Partial<AppointmentReminders> | null,
    ),
  };

  return Response.json(prefs);
}

export async function PATCH(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const body = (await req.json()) as Record<string, unknown>;

  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: { notifyPrefs: true, appointmentReminders: true },
  });

  // Pull `appointmentReminders` out of body so it does not pollute notifyPrefs.
  const { appointmentReminders: incomingReminders, ...flatPrefs } = body;

  const mergedNotify = {
    ...DEFAULT_PREFS,
    ...((existing?.notifyPrefs as Record<string, unknown> | null) ?? {}),
    ...flatPrefs,
  };

  const data: Prisma.UserUpdateInput = {
    notifyPrefs: mergedNotify as unknown as Prisma.InputJsonValue,
  };

  let mergedReminders: AppointmentReminders | undefined;
  if (incomingReminders !== undefined) {
    const current = normalizeAppointmentReminders(
      existing?.appointmentReminders as Partial<AppointmentReminders> | null,
    );
    mergedReminders = normalizeAppointmentReminders({
      ...current,
      ...(incomingReminders as Partial<AppointmentReminders>),
    });
    data.appointmentReminders = mergedReminders as unknown as Prisma.InputJsonValue;
  }

  await prisma.user.update({
    where: { id: user.id },
    data,
  });

  return Response.json({
    ...mergedNotify,
    appointmentReminders:
      mergedReminders ??
      normalizeAppointmentReminders(
        existing?.appointmentReminders as Partial<AppointmentReminders> | null,
      ),
  });
}

export { DEFAULT_APPOINTMENT_REMINDERS };
