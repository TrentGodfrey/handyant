import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

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

  const email = String(body.email).trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Staff can add a customer and home before the customer has an account.
    // Claim that passwordless customer record instead of creating a duplicate;
    // the existing homes then remain linked to this login automatically.
    if (existing.role !== "customer" || existing.passwordHash || existing.googleId) {
      return Response.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await hash(body.password, 12);
    const claimedResult = await prisma.user.updateMany({
      where: { id: existing.id, passwordHash: null, googleId: null, role: "customer" },
      data: {
        passwordHash,
        name: String(body.name).trim(),
        phone:
          typeof body.phone === "string" && body.phone.trim().length > 0
            ? String(body.phone).trim()
            : existing.phone,
      },
    });

    if (claimedResult.count !== 1) {
      return Response.json({ error: "Email already registered" }, { status: 409 });
    }

    const claimed = await prisma.user.findUniqueOrThrow({
      where: { id: existing.id },
      include: { homes: { select: { id: true } } },
    });

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
