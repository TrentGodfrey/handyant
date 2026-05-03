import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const required: Array<[keyof typeof body, string]> = [
    ["name", "Name"],
    ["email", "Email"],
    ["password", "Password"],
    ["phone", "Phone"],
    ["address", "Street address"],
    ["city", "City"],
    ["state", "State"],
    ["zip", "ZIP"],
  ];

  for (const [key, label] of required) {
    const v = body?.[key];
    if (typeof v !== "string" || v.trim().length === 0) {
      return Response.json({ error: `${label} is required` }, { status: 400 });
    }
  }

  if (!/^\d{5}$/.test(String(body.zip).trim())) {
    return Response.json(
      { error: "ZIP must be 5 digits" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email: body.email },
  });

  if (existing) {
    return Response.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await hash(body.password, 12);

  // Create user + their initial home atomically; if either fails, neither
  // persists. The customer onboarding flow assumes a Home exists.
  const { user, home } = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: body.email,
        passwordHash,
        name: body.name,
        phone: body.phone,
        role: "customer",
      },
    });

    const home = await tx.home.create({
      data: {
        customerId: user.id,
        address: String(body.address).trim(),
        city: String(body.city).trim(),
        state: String(body.state).trim().toUpperCase(),
        zip: String(body.zip).trim(),
      },
    });

    return { user, home };
  });

  return Response.json(
    { id: user.id, email: user.email, name: user.name, homeId: home.id },
    { status: 201 }
  );
}
