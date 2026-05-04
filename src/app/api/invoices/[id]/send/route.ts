import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized, notFound, forbidden } from "@/lib/session";
import { sendEmail, emailShell, escapeHtml } from "@/lib/email";

function fmtMoney(value: unknown): string {
  const n = Number(value ?? 0);
  return `$${n.toFixed(2)}`;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  // Body is optional; default to including payment info for backward compat.
  let includePaymentLink = true;
  try {
    const text = await req.text();
    if (text) {
      const parsed = JSON.parse(text) as { includePaymentLink?: boolean };
      if (typeof parsed?.includePaymentLink === "boolean") {
        includePaymentLink = parsed.includePaymentLink;
      }
    }
  } catch {
    /* ignore — fall back to default */
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      booking: {
        include: {
          tasks: { orderBy: { sortOrder: "asc" } },
          parts: true,
          home: true,
          tech: { select: { id: true, name: true, phone: true, email: true } },
        },
      },
      customer: { select: { id: true, name: true, email: true, phone: true } },
    },
  });
  if (!invoice) return notFound("Invoice not found");

  const isOwningTech = user.role === "tech" && invoice.booking.techId === user.id;
  if (!isOwningTech && user.role !== "tech") return forbidden();
  // Allow any tech (admin) — owning tech preferred but role:"tech" is admin role here.

  const customerEmail = invoice.customer?.email;
  if (!customerEmail) {
    return Response.json(
      { ok: false, error: "Customer has no email address on file" },
      { status: 400 },
    );
  }

  // Pull tech contact info — prefer business profile phone, fall back to tech user phone.
  const techId = invoice.booking.techId ?? invoice.booking.tech?.id;
  const businessProfile = techId
    ? await prisma.businessProfile.findUnique({ where: { techId } })
    : null;
  const techName = invoice.booking.tech?.name ?? "Anthony";
  const techPhone = businessProfile?.phone ?? invoice.booking.tech?.phone ?? "";

  // Build line items: labor (from duration) + parts.
  const durationMins = invoice.booking.durationMinutes ?? 120;
  const hours = durationMins / 60;
  const laborRate = 80;
  const labor = Math.round(hours * laborRate);
  const taskLabels = invoice.booking.tasks.map((t) => t.label).join(" + ") || "Service visit";
  const lineItems: { description: string; detail: string; amount: number }[] = [
    {
      description: `Labor — ${taskLabels}`,
      detail: `${hours} hrs @ $${laborRate}/hr`,
      amount: labor,
    },
    ...invoice.booking.parts.map((p) => ({
      description: `Materials — ${p.item}`,
      detail: `Qty ${p.qty ?? 1}`,
      amount: Number(p.cost ?? 0),
    })),
  ];

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://mcq.jordangodfrey.com";
  const receiptsUrl = `${baseUrl}/account/receipts`;

  const subtotalStr = fmtMoney(invoice.subtotal);
  const taxStr = fmtMoney(invoice.tax);
  const totalStr = fmtMoney(invoice.total);
  const customerName = invoice.customer?.name ?? "Customer";
  const description = invoice.booking.description ?? taskLabels;

  // Build the line item rows for HTML.
  const lineItemRows = lineItems
    .map(
      (li) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #ececec;vertical-align:top;">
            <div style="font-size:13px;font-weight:600;color:#1a1a1a;">${escapeHtml(li.description)}</div>
            <div style="font-size:11px;color:#6a7280;margin-top:2px;">${escapeHtml(li.detail)}</div>
          </td>
          <td align="right" style="padding:10px 0;border-bottom:1px solid #ececec;font-size:13px;font-weight:600;color:#1a1a1a;vertical-align:top;white-space:nowrap;">
            ${fmtMoney(li.amount)}
          </td>
        </tr>`,
    )
    .join("");

  const techPhoneHtml = techPhone
    ? `<div style="margin-top:4px;font-size:12px;color:#6a7280;">Phone: ${escapeHtml(techPhone)}</div>`
    : "";

  // Build payment-method snippets from the tech's BusinessProfile, if requested.
  const paymentMethods: { name: string; handle: string }[] = [];
  if (includePaymentLink && businessProfile) {
    const v = businessProfile.venmoHandle?.trim();
    if (v) paymentMethods.push({ name: "Venmo", handle: v.startsWith("@") ? v : `@${v}` });
    const z = businessProfile.zelleHandle?.trim();
    if (z) paymentMethods.push({ name: "Zelle", handle: z });
    const c = businessProfile.cashappHandle?.trim();
    if (c) paymentMethods.push({ name: "Cash App", handle: c.startsWith("$") ? c : `$${c}` });
    const p = businessProfile.paypalEmail?.trim();
    if (p) paymentMethods.push({ name: "PayPal", handle: p });
  }

  const paymentLinesHtml = paymentMethods
    .map(
      (m) =>
        `<div style="font-size:13px;color:#5b4a1a;line-height:1.7;"><strong>${escapeHtml(m.name)}:</strong> ${escapeHtml(m.handle)}</div>`,
    )
    .join("");

  let paymentBlockHtml = "";
  if (includePaymentLink) {
    if (paymentMethods.length > 0) {
      paymentBlockHtml = `
        <div style="background-color:#fff8e6;border:1px solid #f3d68a;border-radius:10px;padding:14px 16px;margin-bottom:18px;">
          <div style="font-size:13px;font-weight:700;color:#1a1a1a;margin-bottom:6px;">How to Pay</div>
          ${paymentLinesHtml}
          <div style="font-size:12px;color:#5b4a1a;margin-top:8px;line-height:1.5;">
            Or simply reply to this email and we'll sort it out.
          </div>
        </div>
      `;
    } else {
      paymentBlockHtml = `
        <div style="background-color:#fff8e6;border:1px solid #f3d68a;border-radius:10px;padding:14px 16px;margin-bottom:18px;">
          <div style="font-size:13px;font-weight:700;color:#1a1a1a;margin-bottom:4px;">How to Pay</div>
          <div style="font-size:13px;color:#5b4a1a;line-height:1.5;">
            Reply to this email and ${escapeHtml(techName)} will follow up with payment options.
          </div>
        </div>
      `;
    }
  }

  const contentHtml = `
    <h1 style="margin:0 0 6px;font-size:20px;color:#1a1a1a;">Invoice ${escapeHtml(invoice.number)}</h1>
    <p style="margin:0 0 18px;color:#6a7280;font-size:13px;">
      Hi ${escapeHtml(customerName)} — thanks for choosing MCQ Home Co.. Here's your invoice for today's service.
    </p>

    <div style="background-color:#f7f9fc;border-radius:10px;padding:14px 16px;margin-bottom:18px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6a7280;margin-bottom:4px;">
        Service
      </div>
      <div style="font-size:14px;font-weight:600;color:#1a1a1a;">${escapeHtml(description)}</div>
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-bottom:18px;">
      <thead>
        <tr>
          <th align="left" style="padding:0 0 8px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6a7280;border-bottom:1px solid #ececec;">Description</th>
          <th align="right" style="padding:0 0 8px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6a7280;border-bottom:1px solid #ececec;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${lineItemRows}
      </tbody>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-bottom:24px;">
      <tr>
        <td style="padding:4px 0;font-size:13px;color:#6a7280;">Subtotal</td>
        <td align="right" style="padding:4px 0;font-size:13px;color:#1a1a1a;">${subtotalStr}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;font-size:13px;color:#6a7280;">Tax</td>
        <td align="right" style="padding:4px 0;font-size:13px;color:#1a1a1a;">${taxStr}</td>
      </tr>
      <tr>
        <td style="padding:10px 0 4px;font-size:15px;font-weight:700;color:#1a1a1a;border-top:1px solid #ececec;">Total Due</td>
        <td align="right" style="padding:10px 0 4px;font-size:18px;font-weight:700;color:#4F9598;border-top:1px solid #ececec;">${totalStr}</td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;">
      <tr>
        <td align="center" style="padding:0;">
          <a href="${receiptsUrl}" style="display:inline-block;background-color:#4F9598;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:10px;">
            View Invoice Online
          </a>
        </td>
      </tr>
    </table>

    ${paymentBlockHtml}

    <div style="border-top:1px solid #ececec;padding-top:14px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6a7280;margin-bottom:4px;">
        Your Tech
      </div>
      <div style="font-size:14px;font-weight:600;color:#1a1a1a;">${escapeHtml(techName)}</div>
      ${techPhoneHtml}
    </div>
  `;

  const html = emailShell({
    preheader: `Invoice ${invoice.number} — ${totalStr}`,
    contentHtml,
  });

  const textLines: string[] = [
    `Invoice ${invoice.number}`,
    ``,
    `Hi ${customerName}, thanks for choosing MCQ Home Co..`,
    ``,
    `Service: ${description}`,
    ``,
    `Line items:`,
    ...lineItems.map((li) => `  • ${li.description} (${li.detail}) — ${fmtMoney(li.amount)}`),
    ``,
    `Subtotal: ${subtotalStr}`,
    `Tax:      ${taxStr}`,
    `Total:    ${totalStr}`,
    ``,
    `View online: ${receiptsUrl}`,
  ];

  if (includePaymentLink) {
    if (paymentMethods.length > 0) {
      textLines.push(``, `How to pay:`);
      for (const m of paymentMethods) textLines.push(`  • ${m.name}: ${m.handle}`);
      textLines.push(`Or reply to this email.`);
    } else {
      textLines.push(``, `Reply to this email and ${techName} will follow up with payment options.`);
    }
  }

  textLines.push(``, `— ${techName}${techPhone ? ` · ${techPhone}` : ""}`);

  const result = await sendEmail({
    to: customerEmail,
    subject: `Invoice ${invoice.number} from MCQ Home Co. — ${totalStr}`,
    html,
    text: textLines.join("\n"),
  });

  if (!result.ok) {
    return Response.json(
      { ok: false, error: result.error ?? "Email send failed" },
      { status: 500 },
    );
  }

  // Only flip sentAt after a successful send.
  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      sentAt: new Date(),
      status: "sent",
    },
  });

  // Notification for the customer (in-app).
  await prisma.notification.create({
    data: {
      userId: invoice.customerId,
      title: `Invoice from ${techName}`,
      body: `${totalStr} for ${description}`,
      type: "invoice",
      link: "/account/receipts",
    },
  });

  return Response.json({ ok: true, sentAt: updated.sentAt, id: updated.id });
}
