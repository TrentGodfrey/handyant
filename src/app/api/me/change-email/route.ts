import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, badRequest } from "@/lib/session";
import { sendEmail, emailShell, escapeHtml } from "@/lib/email";

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(req: NextRequest) {
  const session = await requireUser();
  if (!session) return unauthorized();

  let body: { newEmail?: unknown; currentPassword?: unknown };
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid request body");
  }

  const newEmail =
    typeof body.newEmail === "string" ? body.newEmail.trim().toLowerCase() : "";
  const currentPassword =
    typeof body.currentPassword === "string" ? body.currentPassword : "";

  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return badRequest("Valid email address required");
  }
  if (!currentPassword) {
    return badRequest("currentPassword required to change email");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
    },
  });
  if (!user) return badRequest("User not found");
  if (!user.passwordHash) {
    return badRequest("Cannot change email: account has no password set");
  }

  const ok = await compare(currentPassword, user.passwordHash);
  if (!ok) {
    return Response.json({ error: "Incorrect password" }, { status: 401 });
  }

  if (newEmail === (user.email ?? "").toLowerCase()) {
    return badRequest("New email must be different from your current email");
  }

  const taken = await prisma.user.findUnique({ where: { email: newEmail } });
  if (taken && taken.id !== user.id) {
    return Response.json({ error: "Email already in use" }, { status: 409 });
  }

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + VERIFY_TTL_MS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      pendingEmail: newEmail,
      emailVerificationToken: token,
      emailVerificationExpires: expires,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "";
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`;
  const safeName = escapeHtml(user.name ?? "there");
  const safeUrl = escapeHtml(verifyUrl);
  const safeNew = escapeHtml(newEmail);

  const html = emailShell({
    preheader: "Confirm your new MCQ Home Co. email address",
    contentHtml: `
      <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;">Confirm your new email</h1>
      <p style="margin:0 0 16px;">Hi ${safeName},</p>
      <p style="margin:0 0 16px;">You requested to change your MCQ Home Co. email to <strong>${safeNew}</strong>. Click the button below to confirm. The change won't take effect until you do. This link expires in 24 hours.</p>
      <p style="margin:24px 0;">
        <a href="${safeUrl}" style="display:inline-block;background-color:#4F9598;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;">Confirm new email</a>
      </p>
      <p style="margin:0 0 8px;font-size:12px;color:#6a7280;">If the button doesn't work, paste this link into your browser:</p>
      <p style="margin:0;font-size:12px;color:#6a7280;word-break:break-all;">${safeUrl}</p>
      <p style="margin:24px 0 0;font-size:12px;color:#6a7280;">If you didn't request this change, you can ignore this email and continue using your current address.</p>
    `,
  });

  await sendEmail({
    to: newEmail,
    subject: "Confirm your new MCQ Home Co. email address",
    html,
    text: `Confirm your new MCQ Home Co. email: ${verifyUrl}\n\nThis link expires in 24 hours. If you didn't request this change, you can ignore it.`,
  });

  return Response.json({ ok: true, pendingVerification: true });
}
