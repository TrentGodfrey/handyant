import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, badRequest } from "@/lib/session";
import { sendVerificationEmail } from "@/lib/verification-email";
import { rateLimited, takeRateLimit } from "@/lib/rate-limit";

export async function POST() {
  const session = await requireUser();
  if (!session) return unauthorized();
  const limit = takeRateLimit(`verify-email:${session.id}`, 5, 60 * 60 * 1000);
  if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      email: true,
      pendingEmail: true,
    },
  });

  if (!user) return badRequest("User not found");

  const result = await sendVerificationEmail(user);
  if (!result.ok) return Response.json({ error: result.error }, { status: 503 });

  return Response.json({ ok: true });
}
