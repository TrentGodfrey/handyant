import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized } from "@/lib/session";

export async function GET(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const unreadOnly = req.nextUrl.searchParams.get("unread") === "true";

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id, ...(unreadOnly ? { read: false } : {}) },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return Response.json(notifications);
}

export async function PATCH(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const body = await req.json();

  if (body.markAllRead) {
    await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });
    return Response.json({ ok: true });
  }

  if (body.id) {
    await prisma.notification.updateMany({
      where: { id: body.id, userId: user.id },
      data: { read: body.read ?? true },
    });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Nothing to do" }, { status: 400 });
}
