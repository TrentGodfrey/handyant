import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as Record<string, unknown>).id as string;
  const homes = await prisma.home.findMany({
    where: { customerId: userId },
    include: { photos: true },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(homes);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as Record<string, unknown>).id as string;
  const body = await req.json();
  const home = await prisma.home.create({
    data: {
      customerId: userId,
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
