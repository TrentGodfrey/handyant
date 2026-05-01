import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail, emailShell, escapeHtml } from "@/lib/email";

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  // Always 200 — never reveal whether the email exists.
  if (!email) return Response.json({ ok: true });

  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + RESET_TTL_MS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpires: expires,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? "";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;
    const safeName = escapeHtml(user.name ?? "there");
    const safeUrl = escapeHtml(resetUrl);

    const html = emailShell({
      preheader: "Reset your MCQ Home Co. password",
      contentHtml: `
        <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;">Reset your password</h1>
        <p style="margin:0 0 16px;">Hi ${safeName},</p>
        <p style="margin:0 0 16px;">We received a request to reset your MCQ Home Co. password. Click the button below to set a new one. This link will expire in 1 hour.</p>
        <p style="margin:24px 0;">
          <a href="${safeUrl}" style="display:inline-block;background-color:#4F9598;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;">Reset password</a>
        </p>
        <p style="margin:0 0 8px;font-size:12px;color:#6a7280;">If the button doesn't work, paste this link into your browser:</p>
        <p style="margin:0;font-size:12px;color:#6a7280;word-break:break-all;">${safeUrl}</p>
        <p style="margin:24px 0 0;font-size:12px;color:#6a7280;">If you didn't request a password reset, you can safely ignore this email.</p>
      `,
    });

    await sendEmail({
      to: user.email!,
      subject: "Reset your MCQ Home Co. password",
      html,
      text: `Reset your MCQ Home Co. password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request a reset, you can ignore this email.`,
    });
  }

  return Response.json({ ok: true });
}
