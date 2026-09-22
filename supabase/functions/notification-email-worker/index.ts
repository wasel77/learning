import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const baseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendKey = Deno.env.get("RESEND_API_KEY");
const siteUrl = "https://waselacademy.com";
const from = "أكاديمية وصل للتطور المالي <notifications@waselacademy.com>";
const replyTo = "thewtofficial@gmail.com";

const bronzeRenewal = "https://thewtofficial.com/تجديد-البرونزيه/p1776842469";
const diamondRenewal = "https://thewtofficial.com/تجديد-الماسيه/p752548395";
const diamondUpgrade = "https://thewtofficial.com/الترقيه-للالماسيه/p927835383";

type EmailRow = {
  id: string; email: string; full_name: string | null; subscription_package: string;
  template_key: string; subject: string; payload: Record<string, unknown>;
  idempotency_key: string; attempts: number;
};

const escapeHtml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

function absoluteLink(link: unknown) {
  const value = String(link ?? "");
  return value.startsWith("/") ? `${siteUrl}${value}` : value.startsWith("https://") ? value : siteUrl;
}

function ctas(row: EmailRow) {
  if (!row.template_key.startsWith("subscription_")) {
    return [{ label: row.template_key === "review_request" ? "قيّمي الجلسة" : "عرض التفاصيل", url: absoluteLink(row.payload.link) }];
  }
  if (row.subscription_package === "diamond") return [{ label: "تجديد الاشتراك", url: diamondRenewal }];
  if (row.subscription_package === "bronze") return [
    { label: "تجديد البرونزية", url: bronzeRenewal },
    { label: "الترقية للألماسية", url: diamondUpgrade, accent: true },
  ];
  return [];
}

function packageNote(row: EmailRow) {
  return row.template_key.startsWith("subscription_") && row.subscription_package === "bronze"
    ? "الترقية للألماسية تفتح لك المزايا الإضافية الموجودة في الأكاديمية، ومنها الكلاسات الخاصة ومستوى محترف والاستراتيجيات الخاصة بالألماسي."
    : "";
}

function render(row: EmailRow) {
  const greeting = row.full_name ? `أهلًا ${escapeHtml(row.full_name)}،` : "أهلًا بك،";
  const body = escapeHtml(row.payload.body);
  const note = escapeHtml(packageNote(row));
  const buttons = ctas(row).map((cta) => `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td align="center" bgcolor="${cta.accent ? "#d6a84b" : "#1d4ed8"}" style="background-color:${cta.accent ? "#d6a84b" : "#1d4ed8"};border-radius:10px;padding-top:13px;padding-right:18px;padding-bottom:13px;padding-left:18px;">
      <a href="${escapeHtml(cta.url)}" style="display:block;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;font-weight:700;color:${cta.accent ? "#172554" : "#ffffff"};text-decoration:none;">${escapeHtml(cta.label)}</a>
    </td></tr></table>`).join('<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td height="10" style="font-size:10px;line-height:10px;color:#ffffff;">&nbsp;</td></tr></table>');

  const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta http-equiv="X-UA-Compatible" content="IE=edge"><title>${escapeHtml(row.subject)}</title></head>
  <body style="margin:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#f1f5f9" style="background-color:#f1f5f9;"><tr><td align="center" style="padding-top:24px;padding-right:12px;padding-bottom:24px;padding-left:12px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:16px;"><tr><td bgcolor="#172554" style="background-color:#172554;border-radius:16px 16px 0 0;padding-top:24px;padding-right:24px;padding-bottom:24px;padding-left:24px;text-align:right;">
  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:30px;font-weight:700;color:#ffffff;">أكاديمية وصل للتطور المالي</p></td></tr><tr><td style="padding-top:28px;padding-right:24px;padding-bottom:28px;padding-left:24px;text-align:right;">
  <p style="margin-top:0;margin-right:0;margin-bottom:14px;margin-left:0;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:28px;font-weight:700;color:#172554;">${greeting}</p>
  <h1 style="margin-top:0;margin-right:0;margin-bottom:14px;margin-left:0;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:36px;font-weight:700;color:#0f172a;">${escapeHtml(row.subject.split("|")[0].trim())}</h1>
  <p style="margin-top:0;margin-right:0;margin-bottom:20px;margin-left:0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:28px;color:#334155;">${body}</p>
  ${note ? `<p style="margin-top:0;margin-right:0;margin-bottom:20px;margin-left:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:25px;color:#475569;background-color:#fff7ed;border-right:4px solid #d6a84b;padding-top:12px;padding-right:14px;padding-bottom:12px;padding-left:14px;">${note}</p>` : ""}
  ${buttons}<p style="margin-top:24px;margin-right:0;margin-bottom:0;margin-left:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:21px;color:#64748b;">هذه رسالة تلقائية من أكاديمية وصل للتطور المالي. للرد أو الاستفسار استخدمي Reply على هذه الرسالة.</p>
  </td></tr></table></td></tr></table></body></html>`;
  const text = `${greeting}\n\n${row.subject.split("|")[0].trim()}\n\n${String(row.payload.body ?? "")}${packageNote(row) ? `\n\n${packageNote(row)}` : ""}\n\n${ctas(row).map((c) => `${c.label}: ${c.url}`).join("\n")}\n\nأكاديمية وصل للتطور المالي`;
  return { html, text };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const gate = req.headers.get("x-worker-gate") ?? "";
  if (!resendKey) return Response.json({ status: "blocked", reason: "missing_resend_key" }, { status: 503 });
  const supabase = createClient(baseUrl, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("claim_notification_email_batch", { p_gate: gate, p_limit: 25 });
  if (error) return Response.json({ status: "unauthorized" }, { status: 401 });
  let sent = 0, failed = 0;
  for (const row of (data ?? []) as EmailRow[]) {
    try {
      const content = render(row);
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json", "Idempotency-Key": row.idempotency_key },
        body: JSON.stringify({ from, to: [row.email], reply_to: replyTo, subject: row.subject, html: content.html, text: content.text,
          tags: [{ name: "template", value: row.template_key.replace(/[^a-zA-Z0-9_-]/g,"_").slice(0,50) }] }),
      });
      const result = await response.json();
      if (!response.ok || !result.id) throw new Error(`resend_${response.status}`);
      await supabase.rpc("complete_notification_email", { p_gate: gate, p_id: row.id, p_sent: true, p_provider_id: result.id, p_error: null });
      sent++;
    } catch (error) {
      await supabase.rpc("complete_notification_email", { p_gate: gate, p_id: row.id, p_sent: false, p_provider_id: null,
        p_error: error instanceof Error ? error.message : "delivery_failed" });
      failed++;
    }
  }
  return Response.json({ status: "ok", claimed: (data ?? []).length, sent, failed });
});
