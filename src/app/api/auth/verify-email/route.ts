import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";

  const baseUrl = process.env.NEXTAUTH_URL ?? req.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(
      `${baseUrl}/verify-email?error=missing_token`
    );
  }

  const user = await prisma.user.findFirst({
    where: { emailVerificationToken: token },
    select: {
      id: true,
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

  // If pendingEmail is set we're confirming a change — swap it into email.
  // Guard against the new address being claimed in the meantime.
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

  return NextResponse.redirect(`${baseUrl}/account?verified=1`);
}
