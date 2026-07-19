import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, notFound, forbidden, badRequest } from "@/lib/session";
import { sendHomeTaskEmail } from "@/lib/task-email";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const home = await prisma.home.findUnique({ where: { id } });
  if (!home) return notFound("Home not found");
  if (home.customerId !== user.id && user.role !== "tech") return forbidden();

  const todos = await prisma.homeTodo.findMany({
    where: { homeId: id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return Response.json(todos);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const home = await prisma.home.findUnique({ where: { id } });
  if (!home) return notFound("Home not found");
  if (home.customerId !== user.id && user.role !== "tech") return forbidden();

  const body = await req.json();
  if (!body.task || typeof body.task !== "string") return badRequest("task required");

  const photoIds = Array.isArray(body.photoIds)
    ? body.photoIds.filter((v: unknown): v is string => typeof v === "string")
    : [];

  const todo = await prisma.homeTodo.create({
    data: {
      homeId: id,
      task: body.task,
      description: body.description ?? null,
      priority: body.priority ?? "medium",
      status: body.status ?? "pending",
      parts: body.parts ?? null,
      partStatus: body.partStatus ?? null,
      partsDescription: body.partsDescription ?? null,
      partsBuyer: body.partsBuyer ?? null,
      specialist: body.specialist ?? false,
      hasPhoto: photoIds.length > 0 || body.hasPhoto === true,
      photoIds,
      notes: body.notes ?? null,
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
