import { prisma } from "@/lib/prisma";

// Service areas are public business information and are used by both the
// marketing page and the signed-in customer experience.
export async function GET() {
  const areas = await prisma.serviceArea.findMany({
    where: { active: true },
    select: { city: true },
    orderBy: { city: "asc" },
  });

  return Response.json(
    [...new Set(areas.map((area) => area.city.trim()).filter(Boolean))],
  );
}
