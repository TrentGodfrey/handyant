import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, notFound, forbidden, badRequest } from "@/lib/session";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const home = await prisma.home.findUnique({ where: { id } });
  if (!home) return notFound("Home not found");
  if (home.customerId !== user.id && user.role !== "tech") return forbidden();

  const notes = await prisma.homeNote.findMany({
    where: { homeId: id },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(notes);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (user.role !== "tech") return forbidden();
  const { id } = await ctx.params;

  const home = await prisma.home.findUnique({ where: { id } });
  if (!home) return notFound("Home not found");

  const body = await req.json();
  if (!body.title || typeof body.title !== "string") return badRequest("title required");

  const note = await prisma.homeNote.create({
    data: {
      homeId: id,
      title: body.title,
      body: body.body ?? null,
      severity: body.severity ?? "info",
      authorId: user.id,
      authorName: user.name ?? null,
    },
  });
  return Response.json(note, { status: 201 });
}
