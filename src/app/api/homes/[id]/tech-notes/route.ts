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
  const { id } = await ctx.params;

  const home = await prisma.home.findUnique({ where: { id } });
  if (!home) return notFound("Home not found");
  if (home.customerId !== user.id && user.role !== "tech") return forbidden();

  const body = (await req.json()) as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return badRequest("title is required");

  const data: Record<string, unknown> = {
    homeId: id,
    title,
    authorId: user.id,
    authorName: user.name ?? null,
  };
  if (typeof body.body === "string") data.body = body.body;
  if (typeof body.severity === "string") data.severity = body.severity;

  const created = await prisma.homeNote.create({ data: data as never });
  return Response.json(created, { status: 201 });
}
