import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).id as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      homes: true,
      subscriptions: { where: { status: "active" }, take: 1 },
      notifications: { where: { read: false }, orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const { passwordHash: _, ...safeUser } = user;
  return Response.json(safeUser);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).id as string;
  const body = await req.json();

  const allowedFields = ["name", "phone", "avatarUrl"];
  const data: Record<string, string> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
  });

  const { passwordHash: _, ...safeUser } = user;
  return Response.json(safeUser);
}
