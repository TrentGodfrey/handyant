import { prisma } from "@/lib/prisma";

export async function GET() {
  const categories = await prisma.serviceCategory.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return Response.json(categories);
}
