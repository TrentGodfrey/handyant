import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, notFound, forbidden, badRequest } from "@/lib/session";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const home = await prisma.home.findUnique({ where: { id } });
  if (!home) return notFound("Home not found");
  if (home.customerId !== user.id && user.role !== "tech") return forbidden();

  const body = (await req.json()) as Record<string, unknown>;
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url) return badRequest("url is required");

  const data: Record<string, unknown> = { homeId: id, url };
  if (typeof body.label === "string") data.label = body.label;
  if (typeof body.type === "string") data.type = body.type;

  const created = await prisma.photo.create({ data: data as never });
  return Response.json(created, { status: 201 });
}
