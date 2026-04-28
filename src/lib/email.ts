import { Resend } from "resend";

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

const DEFAULT_FROM = "HandyAnt <onboarding@resend.dev>";

let cachedClient: Resend | null = null;

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!cachedClient) cachedClient = new Resend(apiKey);
  return cachedClient;
}

/**
 * Send an email via Resend. Degrades gracefully if RESEND_API_KEY isn't set —
 * logs a warning and returns { ok: false } instead of throwing.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const client = getClient();
  if (!client) {
    console.warn(
      "[email] RESEND_API_KEY is not set — skipping send to",
      Array.isArray(params.to) ? params.to.join(", ") : params.to,
    );
    return { ok: false, error: "email not configured" };
  }

  const from = params.from ?? process.env.EMAIL_FROM ?? DEFAULT_FROM;

  try {
    const result = await client.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    if (result.error) {
      console.error("[email] Resend error", result.error);
      return { ok: false, error: result.error.message ?? "send failed" };
    }
    return { ok: true, id: result.data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown send error";
    console.error("[email] send threw", err);
    return { ok: false, error: message };
  }
}

/**
 * Wraps content in a simple HandyAnt-branded email shell.
 * Pure inline CSS, table-based layout for max client compatibility.
 */
export function emailShell({
  preheader,
  contentHtml,
  footerNote,
}: {
  preheader?: string;
  contentHtml: string;
  footerNote?: string;
}): string {
  const safePreheader = preheader ? escapeHtml(preheader) : "";
  const safeFooter =
    footerNote ??
    "HandyAnt — Professional Home Services in DFW. Reply to this email if you have any questions.";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>HandyAnt</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
${safePreheader ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f4f5f7;opacity:0;">${safePreheader}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;padding:24px 0;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <tr>
          <td style="background-color:#0a6ef0;padding:20px 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="vertical-align:middle;">
                  <span style="display:inline-block;width:36px;height:36px;line-height:36px;text-align:center;background-color:#ffffff;color:#0a6ef0;font-weight:700;border-radius:8px;font-size:14px;vertical-align:middle;">HA</span>
                  <span style="margin-left:12px;color:#ffffff;font-size:18px;font-weight:700;vertical-align:middle;">HandyAnt</span>
                </td>
                <td align="right" style="color:#cfe1ff;font-size:11px;vertical-align:middle;">
                  Professional Home Services
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;color:#1a1a1a;font-size:14px;line-height:1.55;">
            ${contentHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:18px 28px;background-color:#fafbfc;border-top:1px solid #ececec;color:#6a7280;font-size:11px;line-height:1.5;text-align:center;">
            ${escapeHtml(safeFooter)}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
