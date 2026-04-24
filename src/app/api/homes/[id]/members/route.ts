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

  const members = await prisma.householdMember.findMany({
    where: { homeId: id },
    orderBy: { sortOrder: "asc" },
  });
  return Response.json(members);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const home = await prisma.home.findUnique({ where: { id } });
  if (!home) return notFound("Home not found");
  if (home.customerId !== user.id) return forbidden();

  const body = await req.json();
  if (!body.name || typeof body.name !== "string") return badRequest("name required");

  const member = await prisma.householdMember.create({
    data: {
      homeId: id,
      name: body.name,
      role: body.role ?? null,
      phone: body.phone ?? null,
    },
  });
  return Response.json(member, { status: 201 });
}
