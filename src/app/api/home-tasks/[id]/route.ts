import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, forbidden, notFound, requireUser, unauthorized } from "@/lib/session";

const ALLOWED_FIELDS = new Set(["task", "description", "priority", "status", "partsDescription", "partsBuyer", "notes", "photoIds", "hasPhoto"]);

async function findAccessibleTask(id: string) {
  const user = await requireUser();
  if (!user) return { error: unauthorized() } as const;
  const task = await prisma.homeTodo.findUnique({ where: { id }, include: { home: { select: { id: true, customerId: true, address: true } } } });
  if (!task) return { error: notFound("Task not found") } as const;
  if (task.home.customerId !== user.id && user.role !== "tech") return { error: forbidden() } as const;
  return { user, task } as const;
}

async function taskResponse<T extends { homeId: string; photoIds: string[] }>(task: T) {
  const photoIds = Array.isArray(task.photoIds) ? task.photoIds : [];
  const photos = photoIds.length
    ? await prisma.photo.findMany({ where: { id: { in: photoIds }, homeId: task.homeId }, orderBy: { uploadedAt: "asc" } })
    : [];
  return { ...task, photos };
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const access = await findAccessibleTask(id);
  if ("error" in access) return access.error;
  return Response.json(await taskResponse(access.task));
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const access = await findAccessibleTask(id);
  if ("error" in access) return access.error;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return badRequest("Invalid body");
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) if (ALLOWED_FIELDS.has(key)) data[key] = value;
  if (typeof data.task === "string") data.task = data.task.trim();
  if (data.task === "") return badRequest("Task name is required");
  if (Array.isArray(data.photoIds)) {
    const requested = data.photoIds.filter((value): value is string => typeof value === "string");
    const valid = await prisma.photo.findMany({ where: { id: { in: requested }, homeId: access.task.homeId }, select: { id: true } });
    data.photoIds = valid.map((photo) => photo.id);
    data.hasPhoto = valid.length > 0;
  }
  const updated = await prisma.homeTodo.update({ where: { id }, data, include: { home: { select: { id: true, address: true } } } });
  return Response.json(await taskResponse(updated));
}
