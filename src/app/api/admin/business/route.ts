import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTech, unauthorized } from "@/lib/session";

const DEFAULT_HOURS = {
  mon: { start: "08:00", end: "17:00", enabled: true },
  tue: { start: "08:00", end: "17:00", enabled: true },
  wed: { start: "08:00", end: "17:00", enabled: true },
  thu: { start: "08:00", end: "17:00", enabled: true },
  fri: { start: "08:00", end: "17:00", enabled: true },
  sat: { start: "09:00", end: "13:00", enabled: false },
  sun: { start: "09:00", end: "13:00", enabled: false },
};

const DEFAULT_NOTIFY = {
  newBookings: true,
  bookingChanges: true,
  reviews: true,
  payments: true,
  sms: true,
  email: true,
};

async function getOrCreate(techId: string) {
  const existing = await prisma.businessProfile.findUnique({ where: { techId } });
  if (existing) return existing;
  return prisma.businessProfile.create({
    data: {
      techId,
      workingHours: DEFAULT_HOURS,
      notifyPrefs: DEFAULT_NOTIFY,
    },
  });
}

export async function GET() {
  const tech = await requireTech();
  if (!tech) return unauthorized();

  const profile = await getOrCreate(tech.id);
  return Response.json(profile);
}

export async function PATCH(req: NextRequest) {
  const tech = await requireTech();
  if (!tech) return unauthorized();

  await getOrCreate(tech.id);
  const body = (await req.json()) as Record<string, unknown>;

  const data: Record<string, unknown> = {};
  if (body.businessName !== undefined) data.businessName = body.businessName;
  if (body.licenseNumber !== undefined) data.licenseNumber = body.licenseNumber;
  if (body.workingHours !== undefined) data.workingHours = body.workingHours;
  if (body.notifyPrefs !== undefined) data.notifyPrefs = body.notifyPrefs;
  if (body.bio !== undefined) data.bio = body.bio;
  if (body.phone !== undefined) data.phone = body.phone;
  if (body.venmoHandle !== undefined) data.venmoHandle = body.venmoHandle;
  if (body.zelleHandle !== undefined) data.zelleHandle = body.zelleHandle;
  if (body.cashappHandle !== undefined) data.cashappHandle = body.cashappHandle;
  if (body.paypalEmail !== undefined) data.paypalEmail = body.paypalEmail;

  const profile = await prisma.businessProfile.update({
    where: { techId: tech.id },
    data,
  });

  return Response.json(profile);
}
