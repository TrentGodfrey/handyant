import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTech, unauthorized, notFound, badRequest } from "@/lib/session";
import {
  createHomeInviteToken,
  hashHomeInviteToken,
  HOME_INVITE_TTL_MS,
  normalizeEmail,
} from "@/lib/home-invitations";
import { emailShell, escapeHtml, sendEmail } from "@/lib/email";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const tech = await requireTech();
  if (!tech) return unauthorized();
  const { id } = await ctx.params;

  const home = await prisma.home.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, email: true, passwordHash: true, googleId: true } },
    },
  });
  if (!home) return notFound("Home not found");
  if (home.customer.passwordHash || home.customer.googleId) {
    return badRequest("This customer already has a linked login");
  }
  if (!home.customer.email) return badRequest("Add the customer email before creating an invitation");

  const email = normalizeEmail(home.customer.email);
  const token = createHomeInviteToken();
  const expiresAt = new Date(Date.now() + HOME_INVITE_TTL_MS);

  await prisma.$transaction(async (tx) => {
    await tx.homeInvitation.deleteMany({
      where: { homeId: id, acceptedAt: null },
    });
    await tx.homeInvitation.create({
      data: {
        homeId: id,
        email,
        tokenHash: hashHomeInviteToken(token),
        expiresAt,
        createdById: tech.id,
      },
    });
  });

  const baseUrl = (process.env.NEXTAUTH_URL ?? _req.nextUrl.origin).replace(/\/$/, "");
  const inviteUrl = `${baseUrl}/signup?invite=${encodeURIComponent(token)}`;
  const safeName = escapeHtml(home.customer.name);
  const safeUrl = escapeHtml(inviteUrl);
  const addressLabel = [home.address, home.city, home.state].filter(Boolean).join(", ");
  const safeAddress = escapeHtml(addressLabel);

  const delivery = await sendEmail({
    to: email,
    subject: "Your MCQ Property Care home is ready",
    html: emailShell({
      preheader: "Create your login and securely link your home",
      contentHtml: `
        <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;">Your home is ready</h1>
        <p style="margin:0 0 16px;">Hi ${safeName},</p>
        <p style="margin:0 0 16px;">Anthony has added <strong>${safeAddress}</strong> to MCQ Property Care. Use this private, single-use link to create your login and connect the home.</p>
        <p style="margin:24px 0;"><a href="${safeUrl}" style="display:inline-block;background-color:#4F9598;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;">Create my login</a></p>
        <p style="margin:0;font-size:12px;color:#6a7280;word-break:break-all;">${safeUrl}</p>
        <p style="margin:16px 0 0;font-size:12px;color:#6a7280;">This link expires in 7 days and can only be used once.</p>
      `,
    }),
    text: `Create your MCQ Property Care login and link ${addressLabel}: ${inviteUrl}\n\nThis single-use link expires in 7 days.`,
    sensitive: true,
  });

  return Response.json({
    inviteUrl,
    expiresAt,
    email,
    emailSent: delivery.ok,
  });
}
