import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashHomeInviteToken } from "@/lib/home-invitations";
import { badRequest, notFound } from "@/lib/session";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (!token) return badRequest("Invitation token is required");

  const invitation = await prisma.homeInvitation.findUnique({
    where: { tokenHash: hashHomeInviteToken(token) },
    include: {
      home: {
        select: {
          address: true,
          city: true,
          state: true,
          customer: { select: { name: true } },
        },
      },
    },
  });

  if (!invitation || invitation.acceptedAt || invitation.expiresAt.getTime() <= Date.now()) {
    return notFound("Invitation is invalid or has expired");
  }

  return Response.json({
    email: invitation.email,
    customerName: invitation.home.customer.name,
    address: [
      invitation.home.address,
      invitation.home.city,
      invitation.home.state,
    ].filter(Boolean).join(", "),
    expiresAt: invitation.expiresAt,
  });
}
