import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashHomeInviteToken, normalizeEmail } from "@/lib/home-invitations";
import { rateLimited, requestIp, takeRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Only name, email, and password are required at signup. Everything else
  // (phone, address) is collected later - at first booking or in
  // /account/manage - so the door is as easy to walk through as possible.
  const required: Array<[keyof typeof body, string]> = [
    ["name", "Name"],
    ["email", "Email"],
    ["password", "Password"],
  ];

  for (const [key, label] of required) {
    const v = body?.[key];
    if (typeof v !== "string" || v.trim().length === 0) {
      return Response.json({ error: `${label} is required` }, { status: 400 });
    }
  }

  if (String(body.password).length < 8) {
    return Response.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const email = normalizeEmail(String(body.email));
  const limit = takeRateLimit(`register:${requestIp(req)}:${email}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== "customer" || existing.passwordHash || existing.googleId) {
      return Response.json({ error: "Email already registered" }, { status: 409 });
    }

    // Knowing a pre-created customer's email is not enough to claim their home.
    // The private invitation proves the signup came through the staff-issued link.
    const inviteToken = typeof body.inviteToken === "string" ? body.inviteToken.trim() : "";
    if (!inviteToken) {
      return Response.json(
        { error: "Use the secure invitation link Anthony sent you to connect this home." },
        { status: 403 },
      );
    }

    const invitation = await prisma.homeInvitation.findUnique({
      where: { tokenHash: hashHomeInviteToken(inviteToken) },
      include: { home: { select: { customerId: true } } },
    });
    if (
      !invitation || invitation.acceptedAt ||
      invitation.expiresAt.getTime() <= Date.now() ||
      invitation.email !== email || invitation.home.customerId !== existing.id
    ) {
      return Response.json({ error: "Invitation is invalid or has expired." }, { status: 403 });
    }

    const passwordHash = await hash(body.password, 12);
    let claimed;
    try {
      claimed = await prisma.$transaction(async (tx) => {
        const claimedResult = await tx.user.updateMany({
          where: { id: existing.id, passwordHash: null, googleId: null, role: "customer" },
          data: {
            passwordHash,
            emailVerified: true,
            name: String(body.name).trim(),
            phone:
              typeof body.phone === "string" && body.phone.trim().length > 0
                ? String(body.phone).trim()
                : existing.phone,
          },
        });
        const acceptedResult = await tx.homeInvitation.updateMany({
          where: { id: invitation.id, acceptedAt: null, expiresAt: { gt: new Date() } },
          data: { acceptedAt: new Date() },
        });
        if (claimedResult.count !== 1 || acceptedResult.count !== 1) {
          throw new Error("Invitation was already used");
        }
        await tx.homeInvitation.deleteMany({
          where: { home: { customerId: existing.id }, acceptedAt: null },
        });
        return tx.user.findUniqueOrThrow({
          where: { id: existing.id },
          include: { homes: { select: { id: true } } },
        });
      });
    } catch {
      return Response.json({ error: "Invitation was already used. Request a new link." }, { status: 409 });
    }

    return Response.json(
      {
        id: claimed.id,
        email: claimed.email,
        name: claimed.name,
        claimedExisting: true,
        linkedHomeCount: claimed.homes.length,
      },
      { status: 200 },
    );
  }

  const passwordHash = await hash(body.password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: String(body.name).trim(),
      // Optional - accept if the form sends it, otherwise leave null.
      phone:
        typeof body.phone === "string" && body.phone.trim().length > 0
          ? String(body.phone).trim()
          : null,
      role: "customer",
    },
  });

  return Response.json(
    { id: user.id, email: user.email, name: user.name, claimedExisting: false, linkedHomeCount: 0 },
    { status: 201 }
  );
}
