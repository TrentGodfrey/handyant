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
    return Response.json({ error: "Email already registered" }, { status: 409 });
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
    { id: user.id, email: user.email, name: user.name },
    { status: 201 }
  );
}
