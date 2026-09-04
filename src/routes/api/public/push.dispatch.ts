import { createFileRoute } from "@tanstack/react-router";

import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/**
 * ส่งการแจ้งเตือนที่ยังไม่ถูกส่งเป็น Push ไปยังอุปกรณ์ของผู้ใช้
 * เรียกจากตัวตั้งเวลา (cron) ด้วย Authorization: Bearer <LOVABLE_CRON_SECRET>
 */
export const Route = createFileRoute("/api/public/push/dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = await authenticateCronRequest(request);
        if (unauthorized) return unauthorized;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendPushToUser } = await import("@/lib/push.server");

        const { data, error } = await supabaseAdmin
          .from("notifications")
          .select("id, user_id, title, body, link")
          .is("push_sent_at", null)
          .order("created_at", { ascending: true })
          .limit(50);
        if (error) return Response.json({ error: error.message }, { status: 500 });

        const rows = data ?? [];
        let delivered = 0;
        for (const row of rows) {
          try {
            const result = await sendPushToUser(row.user_id, {
              title: row.title,
              body: row.body,
              link: row.link,
              tag: row.id,
            });
            delivered += result.sent;
          } catch (err) {
            console.error("push dispatch failed", err);
          }
          await supabaseAdmin
            .from("notifications")
            .update({ push_sent_at: new Date().toISOString() })
            .eq("id", row.id);
        }

        return Response.json({ processed: rows.length, delivered });
      },
    },
  },
});
