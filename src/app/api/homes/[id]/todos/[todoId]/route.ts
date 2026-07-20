import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, notFound, forbidden } from "@/lib/session";
import { sendHomeTaskEmail } from "@/lib/task-email";

const ALLOWED_FIELDS = [
  "task",
  "description",
  "priority",
  "status",
  "parts",
  "partStatus",
  "partsDescription",
  "partsBuyer",
  "specialist",
  "hasPhoto",
  "photoIds",
  "notes",
  "sortOrder",
];

async function ensureAccess(homeId: string) {
  const user = await requireUser();
  if (!user) return { error: unauthorized() };
  const home = await prisma.home.findUnique({ where: { id: homeId } });
  if (!home) return { error: notFound("Home not found") };
  if (home.customerId !== user.id && user.role !== "tech") return { error: forbidden() };
  return { user, home };
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; todoId: string }> },
) {
  const { id, todoId } = await ctx.params;
  const access = await ensureAccess(id);
  if ("error" in access) return access.error;

  const todo = await prisma.homeTodo.findUnique({ where: { id: todoId } });
  if (!todo || todo.homeId !== id) return notFound("Todo not found");

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  const updated = await prisma.homeTodo.update({ where: { id: todoId }, data });
  await sendHomeTaskEmail({
    homeId: id,
    actorRole: access.user.role,
    subject: `MCQ to-do updated: ${updated.task}`,
    message: `${access.user.name} updated “${updated.task}”.${body.status ? ` Status: ${String(body.status).replaceAll("_", " ")}.` : ""}`,
    taskId: updated.id,
  });
  return Response.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; todoId: string }> },
) {
  const { id, todoId } = await ctx.params;
  const access = await ensureAccess(id);
  if ("error" in access) return access.error;

  const todo = await prisma.homeTodo.findUnique({ where: { id: todoId } });
  if (!todo || todo.homeId !== id) return notFound("Todo not found");

  await prisma.homeTodo.delete({ where: { id: todoId } });
  await sendHomeTaskEmail({
    homeId: id,
    actorRole: access.user.role,
    subject: `MCQ to-do removed: ${todo.task}`,
    message: `${access.user.name} removed “${todo.task}” from the home to-do list.`,
  });
  return Response.json({ ok: true });
}
