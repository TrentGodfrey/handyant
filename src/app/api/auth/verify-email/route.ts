import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashSecurityToken } from "@/lib/security-tokens";
import { sendActivityEmail } from "@/lib/activity-email";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";

  const baseUrl = process.env.NEXTAUTH_URL ?? req.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(
      `${baseUrl}/verify-email?error=missing_token`
    );
  }

  const user = await prisma.user.findFirst({
    where: { emailVerificationToken: hashSecurityToken(token) },
    select: {
      id: true,
      name: true,
      email: true,
      pendingEmail: true,
      emailVerificationExpires: true,
    },
  });

  if (!user) {
    return NextResponse.redirect(
      `${baseUrl}/verify-email?error=invalid_token`
    );
  }
  if (
    !user.emailVerificationExpires ||
    user.emailVerificationExpires.getTime() < Date.now()
  ) {
    // Clear the stale token to prevent reuse hints.
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });
    return NextResponse.redirect(
      `${baseUrl}/verify-email?error=expired_token`
    );
  }

  // If pendingEmail is set we're confirming a change - swap it into email.
  // Guard against the new address being claimed in the meantime.
  const isEmailChange = !!user.pendingEmail;
  if (user.pendingEmail) {
    const taken = await prisma.user.findUnique({
      where: { email: user.pendingEmail },
    });
    if (taken && taken.id !== user.id) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          pendingEmail: null,
          emailVerificationToken: null,
          emailVerificationExpires: null,
        },
      });
      return NextResponse.redirect(
        `${baseUrl}/verify-email?error=email_taken`
      );
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        email: user.pendingEmail,
        pendingEmail: null,
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        sessionVersion: { increment: 1 },
      },
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });
  }

  if (!isEmailChange) {
    try {
      const owner = await prisma.user.findFirst({
        where: { role: "tech", isAdmin: true, email: { not: null } },
        orderBy: { createdAt: "asc" },
        select: { name: true, email: true },
      });
      await sendActivityEmail({
        to: owner?.email,
        recipientName: owner?.name,
        subject: `New verified MCQ customer: ${user.name}`,
        heading: "New customer account",
        message: `${user.name} verified ${user.email ?? "their email address"} and can now use customer features.`,
        actionPath: "/people",
        actionLabel: "View customers",
      });
    } catch (error) {
      // Verification is a security action and must not be rolled back if an
      // operational notification is temporarily unavailable.
      console.error("[verify-email] failed to notify the owner", error);
    }
  }

  return NextResponse.redirect(`${baseUrl}/login?verified=1`);
}
