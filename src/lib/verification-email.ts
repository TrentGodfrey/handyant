import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail, emailShell, escapeHtml } from "@/lib/email";
import { hashSecurityToken } from "@/lib/security-tokens";

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

export interface VerificationRecipient {
  id: string;
  name: string | null;
  email: string | null;
  pendingEmail?: string | null;
}

export async function sendVerificationEmail(user: VerificationRecipient) {
  const target = user.pendingEmail ?? user.email;
  if (!target) return { ok: false as const, error: "No email address on file to verify" };

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + VERIFY_TTL_MS);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationToken: hashSecurityToken(token),
      emailVerificationExpires: expires,
    },
  });

  const baseUrl = (process.env.NEXTAUTH_URL ?? "https://mcqpropertycare.com").replace(/\/$/, "");
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`;
  const safeName = escapeHtml(user.name ?? "there");
  const safeUrl = escapeHtml(verifyUrl);
  const safeTarget = escapeHtml(target);
  const result = await sendEmail({
    to: target,
    subject: "Verify your MCQ Property Care email address",
    html: emailShell({
      preheader: "Verify your MCQ Property Care email address",
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
    }),
    text: `Verify your MCQ Property Care email: ${verifyUrl}\n\nThis link expires in 24 hours.`,
    sensitive: true,
  });

  if (!result.ok) {
    return { ok: false as const, error: "Verification email could not be sent" };
  }
  return { ok: true as const };
}
