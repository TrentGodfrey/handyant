import { emailShell, escapeHtml, sendEmail } from "./email";

interface ActivityEmailParams {
  to: string | null | undefined;
  recipientName?: string | null;
  subject: string;
  heading: string;
  message: string;
  actionPath?: string;
  actionLabel?: string;
}

export async function sendActivityEmail(params: ActivityEmailParams) {
  if (!params.to) return { ok: false, error: "recipient has no email" } as const;

  const baseUrl = (process.env.NEXTAUTH_URL ?? "https://mcqpropertycare.com").replace(/\/$/, "");
  const actionUrl = params.actionPath
    ? `${baseUrl}${params.actionPath.startsWith("/") ? params.actionPath : `/${params.actionPath}`}`
    : null;
  const greeting = params.recipientName?.trim().split(/\s+/)[0] || "there";
  const actionHtml = actionUrl
    ? `<p style="margin:24px 0 0;"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background-color:#4F9598;color:#ffffff;text-decoration:none;font-weight:600;padding:11px 18px;border-radius:9px;font-size:14px;">${escapeHtml(params.actionLabel ?? "Open MCQ")}</a></p>`
    : "";

  return sendEmail({
    to: params.to,
    subject: params.subject,
    html: emailShell({
      preheader: params.message,
      contentHtml: `
        <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;">${escapeHtml(params.heading)}</h1>
        <p style="margin:0 0 16px;">Hi ${escapeHtml(greeting)},</p>
        <p style="margin:0;">${escapeHtml(params.message)}</p>
        ${actionHtml}
      `,
    }),
    text: `Hi ${greeting},\n\n${params.message}${actionUrl ? `\n\n${params.actionLabel ?? "Open MCQ"}: ${actionUrl}` : ""}`,
  });
}
