import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  forbidden,
  notFound,
  requireUser,
  unauthorized,
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
import {
  isPrismaTransactionConflict,
  syncLinkedActiveBookingTasks,
} from "@/lib/home-task-sync";

async function findAccessibleTask(id: string) {
  const user = await requireUser();
  if (!user) return { error: unauthorized() } as const;
  const task = await prisma.homeTodo.findUnique({ where: { id }, include: { home: { select: { id: true, customerId: true, address: true } } } });
  if (!task) return { error: notFound("Task not found") } as const;
  if (!(await canAccessHome(user, task.home))) return { error: forbidden() } as const;
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
  if (access.user.role === "customer" && !access.user.emailVerified) {
    return verificationRequired();
  }
  const limit = takeRateLimit(`home-task-update:${access.user.id}`, 120, 60 * 60 * 1000);
  if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return badRequest("Invalid body");
  const data: Record<string, unknown> = {};
  if ("task" in body) {
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
    if (!(key in body)) continue;
    const value = optionalBoundedText(body[key], label, maxLength);
    if (!value.ok) return badRequest(value.message);
    data[key] = value.value;
  }
  if ("partsBuyer" in body) {
    const partsBuyer = optionalPartsBuyer(body.partsBuyer);
    if (!partsBuyer.ok) return badRequest(partsBuyer.message);
    data.partsBuyer = partsBuyer.value;
  }
  if ("partStatus" in body) {
    const partStatus = optionalPartPurchaseStatus(body.partStatus);
    if (!partStatus.ok) return badRequest(partStatus.message);
    data.partStatus = partStatus.value;
  }
  if ("priority" in body) {
    if (!["low", "medium", "high"].includes(body.priority as string)) {
      return badRequest("Priority must be low, medium, or high");
    }
    data.priority = body.priority;
  }
  if ("status" in body) {
    if (typeof body.status !== "string" || !body.status.trim() || body.status.trim().length > 40) {
      return badRequest("Invalid task status");
    }
    data.status = body.status.trim();
  }
  if ("photoIds" in body) {
    if (!Array.isArray(body.photoIds)) return badRequest("photoIds must be a list");
    const requested: string[] = [...new Set<string>(
      (body.photoIds as unknown[]).filter(
        (value: unknown): value is string =>
          typeof value === "string" &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
      ),
    )];
    if (requested.length !== body.photoIds.length || requested.length > 12) {
      return badRequest("One or more task photos are invalid");
    }
    const valid = await prisma.photo.findMany({ where: { id: { in: requested }, homeId: access.task.homeId }, select: { id: true } });
    if (valid.length !== requested.length) {
      return badRequest("One or more task photos do not belong to this home");
    }
    data.photoIds = valid.map((photo) => photo.id);
    data.hasPhoto = valid.length > 0;
  }
  if (Object.keys(data).length === 0) return badRequest("No valid task updates were provided");
  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      const result = await tx.homeTodo.update({
        where: { id },
        data,
        include: { home: { select: { id: true, address: true } } },
      });
      await syncLinkedActiveBookingTasks(tx, result.id, result, data);
      return result;
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (isPrismaTransactionConflict(error)) {
      return Response.json(
        { error: "This task changed while you were editing it. Refresh and try again." },
        { status: 409 },
      );
    }
    throw error;
  }
  await sendHomeTaskEmail({
    homeId: access.task.homeId,
    actorRole: access.user.role,
    subject: `MCQ to-do updated: ${updated.task}`,
    message: `${access.user.name} updated “${updated.task}”.${body.status ? ` Status: ${String(body.status).replaceAll("_", " ")}.` : ""}`,
    taskId: updated.id,
  });
  return Response.json(await taskResponse(updated));
}
