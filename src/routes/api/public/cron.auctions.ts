import { createFileRoute } from "@tanstack/react-router";

/**
 * Auction maintenance endpoint (call every minute from pg_cron or any scheduler):
 *  - closes auctions whose end_time has passed and issues the winner's order
 *  - cancels unpaid orders past their 24h deadline and passes the card to the next bidder
 *  - delivers queued notification emails through Resend
 *
 * Requires the `x-cron-secret` header (or `?secret=`) to match LOVABLE_CRON_SECRET.
 */
export const Route = createFileRoute("/api/public/cron/auctions")({
  server: {
    handlers: {
      GET: ({ request }) => run(request),
      POST: ({ request }) => run(request),
    },
  },
});

async function run(request: Request) {
  const secret = process.env["LOVABLE_CRON_SECRET"];
  const provided =
    request.headers.get("x-cron-secret") ?? new URL(request.url).searchParams.get("secret");
  if (!secret || provided !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const closed = await supabaseAdmin.rpc("close_expired_auctions");
  const expired = await supabaseAdmin.rpc("expire_unpaid_orders");
  const autoCompleted = await supabaseAdmin.rpc("auto_complete_shipped_orders");

  const emails = await sendPendingEmails(supabaseAdmin);

  return Response.json({
    ok: true,
    auctionsClosed: closed.error ? closed.error.message : closed.data,
    ordersExpired: expired.error ? expired.error.message : expired.data,
    ordersAutoCompleted: autoCompleted.error ? autoCompleted.error.message : autoCompleted.data,
    emailsSent: emails,
  });
}

type AdminClient = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

async function sendPendingEmails(client: AdminClient) {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) return 0;

  const { data, error } = await client
    .from("notifications")
    .select("id, title, body, link, email_to")
    .is("email_sent_at", null)
    .not("email_to", "is", null)
    .order("created_at", { ascending: true })
    .limit(25);
  if (error || !data?.length) return 0;

  const base = process.env["PUBLIC_SITE_URL"] ?? "https://prompt-kanin-palette.lovable.app";
  let sent = 0;

  for (const n of data) {
    const html = `<div style="font-family:Prompt,Helvetica,Arial,sans-serif;max-width:520px;margin:auto;padding:24px">
      <h2 style="font-size:18px;margin:0 0 12px">${escapeHtml(n.title)}</h2>
      <p style="font-size:14px;line-height:1.7;color:#444">${escapeHtml(n.body ?? "")}</p>
      ${
        n.link
          ? `<p style="margin-top:20px"><a href="${base}${n.link}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:11px 20px;border-radius:12px;font-size:14px">เปิดดูรายละเอียด</a></p>`
          : ""
      }
      <p style="margin-top:28px;font-size:12px;color:#999">Taletails Card Marketplace</p>
    </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Taletails <onboarding@resend.dev>",
        to: [n.email_to],
        subject: n.title,
        html,
      }),
    });

    if (res.ok) {
      await client
        .from("notifications")
        .update({ email_sent_at: new Date().toISOString() })
        .eq("id", n.id);
      sent += 1;
    }
  }

  return sent;
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
