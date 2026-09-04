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

        const { dispatchPendingPush } = await import("@/lib/push.server");
        const result = await dispatchPendingPush(50);

        return Response.json(result);
      },
    },
  },
});
