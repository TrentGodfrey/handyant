import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized } from "@/lib/session";

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
    select: { notifyPrefs: true },
  });

  const prefs = {
    ...DEFAULT_PREFS,
    ...((record?.notifyPrefs as Record<string, unknown> | null) ?? {}),
  };

  return Response.json(prefs);
}

export async function PATCH(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const body = (await req.json()) as Record<string, unknown>;

  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: { notifyPrefs: true },
  });

  const merged = {
    ...DEFAULT_PREFS,
    ...((existing?.notifyPrefs as Record<string, unknown> | null) ?? {}),
    ...body,
  };

  await prisma.user.update({
    where: { id: user.id },
    data: { notifyPrefs: merged },
  });

  return Response.json(merged);
}
