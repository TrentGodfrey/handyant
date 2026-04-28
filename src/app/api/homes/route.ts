import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized } from "@/lib/session";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const homes = await prisma.home.findMany({
    where: { customerId: user.id },
    include: { photos: true },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(homes);
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const body = await req.json();
  const home = await prisma.home.create({
    data: {
      customerId: user.id,
      address: body.address,
      city: body.city ?? null,
      state: body.state ?? "TX",
      zip: body.zip ?? null,
      notes: body.notes ?? null,
      gateCode: body.gateCode ?? null,
    },
  });
  return Response.json(home, { status: 201 });
}
