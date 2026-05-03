import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireTech, unauthorized, badRequest, forbidden } from "@/lib/session";

export async function GET() {
  const tech = await requireTech();
  if (!tech) return unauthorized();

  const staff = await prisma.user.findMany({
    where: { role: "tech" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(staff);
}

export async function POST(req: NextRequest) {
  const tech = await requireTech();
  if (!tech) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return badRequest("Invalid body");

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";

  if (!name) return badRequest("Name is required");
  if (!email) return badRequest("Email is required");
  if (!phone) return badRequest("Phone is required");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // If they exist as a customer already, promote — preserve history.
    if (existing.role !== "tech") {
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: { role: "tech", name, phone },
      });
      // No new password issued for existing accounts.
      return Response.json(
        { id: updated.id, email: updated.email, tempPassword: null, promoted: true },
        { status: 200 }
      );
    }
    return badRequest("That email already belongs to a staff member");
  }

  // Generate a temp password the inviting tech shares out-of-band.
  // Avoid look-alike chars (0/O, 1/l) for verbal handoff.
  const tempPassword = generateTempPassword(12);
  const passwordHash = await hash(tempPassword, 12);

  const created = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      passwordHash,
      role: "tech",
      emailVerified: false,
    },
    select: { id: true, email: true },
  });

  return Response.json(
    { id: created.id, email: created.email, tempPassword },
    { status: 201 }
  );
}

export async function DELETE(req: NextRequest) {
  const tech = await requireTech();
  if (!tech) return unauthorized();

  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return badRequest("userId is required");

  if (userId === tech.id) {
    return forbidden();
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!target) return badRequest("User not found");
  if (target.role !== "tech") {
    return badRequest("User is not a staff member");
  }

  // Demote rather than delete — preserves bookings, reviews, etc.
  await prisma.user.update({
    where: { id: userId },
    data: { role: "customer" },
  });

  return Response.json({ ok: true });
}

const TEMP_PASSWORD_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function generateTempPassword(length: number): string {
  const buf = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += TEMP_PASSWORD_ALPHABET[buf[i] % TEMP_PASSWORD_ALPHABET.length];
  }
  return out;
}
