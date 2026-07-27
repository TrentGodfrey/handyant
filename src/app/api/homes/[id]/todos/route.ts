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

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (user.role === "customer" && !user.emailVerified) return verificationRequired();
  const { id } = await ctx.params;

  const home = await prisma.home.findUnique({ where: { id } });
  if (!home) return notFound("Home not found");
  if (!(await canAccessHome(user, home))) return forbidden();

  const todos = await prisma.homeTodo.findMany({
    where: { homeId: id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return Response.json(todos);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (user.role === "customer" && !user.emailVerified) return verificationRequired();
  const limit = takeRateLimit(`home-task-create:${user.id}`, 30, 60 * 60 * 1000);
  if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);
  const { id } = await ctx.params;

  const home = await prisma.home.findUnique({ where: { id } });
  if (!home) return notFound("Home not found");
  if (!(await canAccessHome(user, home))) return forbidden();

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return badRequest("Invalid request body");
  }
  const taskText = requiredBoundedText(
    body.task,
    "Task",
    TEXT_LIMITS.taskTitle,
  );
  if (!taskText.ok) return badRequest(taskText.message);
  const description = optionalBoundedText(
    body.description,
    "Description",
    TEXT_LIMITS.taskDescription,
  );
  if (!description.ok) return badRequest(description.message);
  const parts = optionalBoundedText(
    body.parts,
    "Parts",
    TEXT_LIMITS.partsDescription,
  );
  if (!parts.ok) return badRequest(parts.message);
  const partsDescription = optionalBoundedText(
    body.partsDescription,
    "Parts details",
    TEXT_LIMITS.partsDescription,
  );
  if (!partsDescription.ok) return badRequest(partsDescription.message);
  const partsBuyer = optionalBoundedText(
    body.partsBuyer,
    "Parts buyer",
    TEXT_LIMITS.partsBuyer,
  );
  if (!partsBuyer.ok) return badRequest(partsBuyer.message);
  const partStatus = optionalBoundedText(
    body.partStatus,
    "Parts status",
    TEXT_LIMITS.partsBuyer,
  );
  if (!partStatus.ok) return badRequest(partStatus.message);
  const notes = optionalBoundedText(
    body.notes,
    "Notes",
    TEXT_LIMITS.taskNotes,
  );
  if (!notes.ok) return badRequest(notes.message);
  const priority = typeof body.priority === "string" ? body.priority : "medium";
  if (!["low", "medium", "high"].includes(priority)) {
    return badRequest("Priority must be low, medium, or high");
  }
  const status = typeof body.status === "string" ? body.status.trim() : "pending";
  if (!status || status.length > 40) return badRequest("Invalid task status");

  const requestedPhotoIds: string[] = Array.isArray(body.photoIds)
    ? [...new Set<string>(
        (body.photoIds as unknown[]).filter(
          (value: unknown): value is string =>
            typeof value === "string" &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
        ),
      )]
    : [];
  if (requestedPhotoIds.length > 12) {
    return badRequest("A task can include at most 12 photos");
  }
  if (
    Array.isArray(body.photoIds) &&
    requestedPhotoIds.length !== body.photoIds.length
  ) {
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
  const photoIds = validPhotos.map((photo) => photo.id);

  const todo = await prisma.homeTodo.create({
    data: {
      homeId: id,
      task: taskText.value,
      description: description.value,
      priority: priority as "low" | "medium" | "high",
      status,
      parts: parts.value,
      partStatus: partStatus.value,
      partsDescription: partsDescription.value,
      partsBuyer: partsBuyer.value,
      specialist: body.specialist === true,
      hasPhoto: photoIds.length > 0,
      photoIds,
      notes: notes.value,
    },
  });

  await sendHomeTaskEmail({
    homeId: id,
    actorRole: user.role,
    subject: `New MCQ to-do: ${todo.task}`,
    message: `${user.name} added “${todo.task}” to the home to-do list.`,
    taskId: todo.id,
  });

  return Response.json(todo, { status: 201 });
}
