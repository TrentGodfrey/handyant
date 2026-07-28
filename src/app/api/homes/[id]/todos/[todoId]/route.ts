import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireUser,
  unauthorized,
  notFound,
  forbidden,
  badRequest,
  verificationRequired,
} from "@/lib/session";
import { sendHomeTaskEmail } from "@/lib/task-email";
import { canAccessHome } from "@/lib/resource-access";
import { rateLimited, takeRateLimit } from "@/lib/rate-limit";
import {
  TEXT_LIMITS,
  optionalBoundedText,
  requiredBoundedText,
} from "@/lib/text-input";
import {
  optionalPartPurchaseStatus,
  optionalPartsBuyer,
} from "@/lib/parts-status";

async function ensureAccess(homeId: string) {
  const user = await requireUser();
  if (!user) return { error: unauthorized() };
  const home = await prisma.home.findUnique({ where: { id: homeId } });
  if (!home) return { error: notFound("Home not found") };
  if (!(await canAccessHome(user, home))) return { error: forbidden() };
  return { user, home };
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; todoId: string }> },
) {
  const { id, todoId } = await ctx.params;
  const access = await ensureAccess(id);
  if ("error" in access) return access.error;
  if (access.user.role === "customer" && !access.user.emailVerified) {
    return verificationRequired();
  }
  const limit = takeRateLimit(`home-task-update:${access.user.id}`, 120, 60 * 60 * 1000);
  if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);

  const todo = await prisma.homeTodo.findUnique({ where: { id: todoId } });
  if (!todo || todo.homeId !== id) return notFound("Todo not found");

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return badRequest("Invalid request body");
  }
  const data: Record<string, unknown> = {};
  if (body.task !== undefined) {
    const task = requiredBoundedText(body.task, "Task", TEXT_LIMITS.taskTitle);
    if (!task.ok) return badRequest(task.message);
    data.task = task.value;
  }
  const optionalTextFields = [
    ["description", "Description", TEXT_LIMITS.taskDescription],
    ["parts", "Parts", TEXT_LIMITS.partsDescription],
    ["partsDescription", "Parts details", TEXT_LIMITS.partsDescription],
    ["notes", "Notes", TEXT_LIMITS.taskNotes],
  ] as const;
  for (const [key, label, maxLength] of optionalTextFields) {
    if (body[key] === undefined) continue;
    const value = optionalBoundedText(body[key], label, maxLength);
    if (!value.ok) return badRequest(value.message);
    data[key] = value.value;
  }
  if (body.partsBuyer !== undefined) {
    const partsBuyer = optionalPartsBuyer(body.partsBuyer);
    if (!partsBuyer.ok) return badRequest(partsBuyer.message);
    data.partsBuyer = partsBuyer.value;
  }
  if (body.partStatus !== undefined) {
    const partStatus = optionalPartPurchaseStatus(body.partStatus);
    if (!partStatus.ok) return badRequest(partStatus.message);
    data.partStatus = partStatus.value;
  }
  if (body.priority !== undefined) {
    if (!["low", "medium", "high"].includes(body.priority)) {
      return badRequest("Priority must be low, medium, or high");
    }
    data.priority = body.priority;
  }
  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !body.status.trim() || body.status.trim().length > 40) {
      return badRequest("Invalid task status");
    }
    data.status = body.status.trim();
  }
  if (body.specialist !== undefined) {
    if (typeof body.specialist !== "boolean") return badRequest("specialist must be true or false");
    data.specialist = body.specialist;
  }
  if (body.sortOrder !== undefined) {
    if (!Number.isInteger(body.sortOrder) || body.sortOrder < 0 || body.sortOrder > 10_000) {
      return badRequest("Invalid task order");
    }
    data.sortOrder = body.sortOrder;
  }
  if (body.photoIds !== undefined) {
    if (!Array.isArray(body.photoIds)) return badRequest("photoIds must be a list");
    const requestedPhotoIds: string[] = [...new Set<string>(
      (body.photoIds as unknown[]).filter(
        (value: unknown): value is string =>
          typeof value === "string" &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
      ),
    )];
    if (requestedPhotoIds.length !== body.photoIds.length || requestedPhotoIds.length > 12) {
      return badRequest("One or more task photos are invalid");
    }
    const validPhotos = requestedPhotoIds.length
      ? await prisma.photo.findMany({
          where: { id: { in: requestedPhotoIds }, homeId: id },
          select: { id: true },
        })
      : [];
    if (validPhotos.length !== requestedPhotoIds.length) {
      return badRequest("One or more task photos do not belong to this home");
    }
    data.photoIds = validPhotos.map((photo) => photo.id);
    data.hasPhoto = validPhotos.length > 0;
  }
  if (Object.keys(data).length === 0) return badRequest("No valid task updates were provided");

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
  if (access.user.role === "customer" && !access.user.emailVerified) {
    return verificationRequired();
  }
  const limit = takeRateLimit(`home-task-delete:${access.user.id}`, 60, 60 * 60 * 1000);
  if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);

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
