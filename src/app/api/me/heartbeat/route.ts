import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized } from "@/lib/session";

// Updates the signed-in user's `lastSeenAt` so other clients can derive a
// real online-presence indicator. The frontend pings this every ~60s.
export async function POST() {
  const user = await requireUser();
  if (!user) return unauthorized();

  await prisma.user.update({
    where: { id: user.id },
    data: { lastSeenAt: new Date() },
  });

  return Response.json({ ok: true });
}
