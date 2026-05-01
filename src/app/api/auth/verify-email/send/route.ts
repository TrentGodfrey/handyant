import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, badRequest } from "@/lib/session";
import { sendEmail, emailShell, escapeHtml } from "@/lib/email";

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function POST() {
  const session = await requireUser();
  if (!session) return unauthorized();

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      email: true,
      pendingEmail: true,
    },
  });

  if (!user) return badRequest("User not found");

  // Prefer pendingEmail if a change is in flight, otherwise the current email.
  const target = user.pendingEmail ?? user.email;
  if (!target) {
    return badRequest("No email address on file to verify");
  }

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + VERIFY_TTL_MS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationToken: token,
      emailVerificationExpires: expires,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "";
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`;
  const safeName = escapeHtml(user.name ?? "there");
  const safeUrl = escapeHtml(verifyUrl);
  const safeTarget = escapeHtml(target);

  const html = emailShell({
    preheader: "Verify your MCQ Home Co. email address",
    contentHtml: `
      <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;">Verify your email</h1>
      <p style="margin:0 0 16px;">Hi ${safeName},</p>
      <p style="margin:0 0 16px;">Please confirm <strong>${safeTarget}</strong> is your email address. This link expires in 24 hours.</p>
      <p style="margin:24px 0;">
        <a href="${safeUrl}" style="display:inline-block;background-color:#4F9598;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;">Verify email</a>
      </p>
      <p style="margin:0 0 8px;font-size:12px;color:#6a7280;">If the button doesn't work, paste this link into your browser:</p>
      <p style="margin:0;font-size:12px;color:#6a7280;word-break:break-all;">${safeUrl}</p>
      <p style="margin:24px 0 0;font-size:12px;color:#6a7280;">If you didn't request this, you can safely ignore this email.</p>
    `,
  });

  await sendEmail({
    to: target,
    subject: "Verify your MCQ Home Co. email address",
    html,
    text: `Verify your MCQ Home Co. email: ${verifyUrl}\n\nThis link expires in 24 hours.`,
  });

  return Response.json({ ok: true });
}
