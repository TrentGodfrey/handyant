import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, verificationRequired } from "@/lib/session";
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
  if (user.role === "customer" && !user.emailVerified) return verificationRequired();
  const body = await req.json();
  const city = typeof body.city === "string"
    ? body.city.trim().replace(/\s+/g, " ")
    : "";

  // Customer-created homes must be in an active service city. This keeps the
  // rule authoritative even if a caller bypasses the onboarding UI.
  if (user.role === "customer") {
    const activeServiceArea = city
      ? await prisma.serviceArea.findFirst({
          where: {
            active: true,
            city: { equals: city, mode: "insensitive" },
          },
          select: { id: true },
        })
      : null;
    if (!activeServiceArea) {
      return Response.json(
        {
          error: city
            ? `${city} is not currently in the MCQ service area.`
            : "City is required.",
          code: city ? "OUTSIDE_SERVICE_AREA" : "CITY_REQUIRED",
        },
        { status: 422 },
      );
    }
  }

  const home = await prisma.home.create({
    data: {
      customerId: user.id,
      address: body.address,
      city: city || null,
      state: body.state ?? "TX",
      zip: body.zip ?? null,
      notes: body.notes ?? null,
      gateCode: encryptSensitiveValue(body.gateCode ?? null),
      wifiPassword: encryptSensitiveValue(body.wifiPassword ?? null),
      yearBuilt: Number.isInteger(body.yearBuilt) ? body.yearBuilt : null,
    },
  });
  return Response.json(decryptHomeAccess(home), { status: 201 });
}
