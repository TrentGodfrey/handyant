import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTech, unauthorized, badRequest } from "@/lib/session";

export async function GET(req: NextRequest) {
  const tech = await requireTech();
  if (!tech) return unauthorized();

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  const where: Record<string, unknown> = { techId: tech.id };
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.gte = new Date(from);
    if (to) range.lte = new Date(to);
    where.startAt = range;
  }

  const blocks = await prisma.availabilityBlock.findMany({
    where,
    orderBy: { startAt: "asc" },
  });
  return Response.json(blocks);
}

export async function POST(req: NextRequest) {
  const tech = await requireTech();
  if (!tech) return unauthorized();

  const body = (await req.json()) as { startAt?: string; endAt?: string; reason?: string };
  if (!body.startAt || !body.endAt) return badRequest("startAt and endAt required");

  const startAt = new Date(body.startAt);
  const endAt = new Date(body.endAt);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return badRequest("Invalid date");
  }
  if (endAt <= startAt) return badRequest("endAt must be after startAt");

  const block = await prisma.availabilityBlock.create({
    data: {
      techId: tech.id,
      startAt,
      endAt,
      reason: body.reason ?? null,
    },
  });

  return Response.json(block, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const tech = await requireTech();
  if (!tech) return unauthorized();

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return badRequest("id required");

  await prisma.availabilityBlock.deleteMany({
    where: { id, techId: tech.id },
  });
  return Response.json({ ok: true });
}
