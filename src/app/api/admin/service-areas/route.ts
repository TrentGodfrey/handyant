import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTech, unauthorized, badRequest } from "@/lib/session";

export async function GET() {
  const tech = await requireTech();
  if (!tech) return unauthorized();

  const areas = await prisma.serviceArea.findMany({
    where: { techId: tech.id },
    orderBy: { city: "asc" },
  });
  return Response.json(areas);
}

export async function POST(req: NextRequest) {
  const tech = await requireTech();
  if (!tech) return unauthorized();

  const body = await req.json();
  if (!body.city) return badRequest("city required");

  const area = await prisma.serviceArea.upsert({
    where: { techId_city: { techId: tech.id, city: body.city } },
    update: { active: true },
    create: { techId: tech.id, city: body.city, active: true },
  });
  return Response.json(area, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const tech = await requireTech();
  if (!tech) return unauthorized();

  const city = req.nextUrl.searchParams.get("city");
  if (!city) return badRequest("city required");

  await prisma.serviceArea.deleteMany({
    where: { techId: tech.id, city },
  });
  return Response.json({ ok: true });
}
