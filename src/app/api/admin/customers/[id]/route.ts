import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, notFound, requireTech, unauthorized } from "@/lib/session";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tech = await requireTech();
  if (!tech) return unauthorized();

  const { id } = await ctx.params;
  const customer = await prisma.user.findFirst({ where: { id, role: "customer" } });
  if (!customer) return notFound("Customer not found");

  const body = await req.json();
  if (body.email === undefined) return badRequest("Email is required");

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return badRequest("Enter a valid email address");

  const emailOwner = await prisma.user.findUnique({ where: { email } });
  if (emailOwner && emailOwner.id !== id) {
    return Response.json({ error: "That email is already in use" }, { status: 409 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { email },
    select: { id: true, name: true, email: true, phone: true },
  });

  return Response.json(updated);
}
