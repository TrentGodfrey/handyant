import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized } from "@/lib/session";

/**
 * Returns the default tech a customer should message when they have no
 * existing conversation and no booking yet. Currently MCQ Home Co. has a single
 * tech (Anthony), so we just return the first tech we find.
 */
export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  const tech = await prisma.user.findFirst({
    where: { role: "tech" },
    select: { id: true, name: true, phone: true, avatarUrl: true },
    orderBy: { createdAt: "asc" },
  });

  if (!tech) {
    return Response.json({ error: "No tech available" }, { status: 404 });
  }

  return Response.json(tech);
}
