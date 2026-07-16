import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized } from "@/lib/session";
import { decryptHomeAccess, encryptSensitiveValue } from "@/lib/sensitive-data";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const homes = await prisma.home.findMany({
    where: { customerId: user.id },
    include: { photos: true },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(homes.map(decryptHomeAccess));
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
      gateCode: encryptSensitiveValue(body.gateCode ?? null),
      wifiPassword: encryptSensitiveValue(body.wifiPassword ?? null),
    },
  });
  return Response.json(decryptHomeAccess(home), { status: 201 });
}
