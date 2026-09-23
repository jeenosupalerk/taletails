import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuthUserId } from "@/hooks/useCardDetail";

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

/** รายการแจ้งเตือนของผู้ใช้ (อัปเดตสดผ่าน useNotificationRealtime ที่ติดตั้งไว้ที่เดียวใน __root) */
export function useNotifications() {
  const userId = useAuthUserId();

  const query = useQuery({
    queryKey: ["notifications", userId],
    enabled: Boolean(userId),
    refetchInterval: 30_000,
    queryFn: async () => {
      // กรองเฉพาะของผู้ใช้ปัจจุบันเสมอ (กันกรณีบัญชีแอดมินเห็นของคนอื่นปนมา)
      const { data, error } = await supabase
        .from("notifications")
        .select("id, user_id, type, title, body, link, read_at, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as NotificationRow[];
    },
  });

  const items = query.data ?? [];
  return { items, unread: items.filter((n) => !n.read_at).length, isLoading: query.isLoading };
}

/**
 * ฟังแจ้งเตือนใหม่แบบสด (Realtime) — ต้องเรียกที่เดียวทั้งเว็บ (NotificationListener ใน __root)
 * เดิมอยู่ใน useNotifications ซึ่งถูกใช้ทั้งกระดิ่งเมนูบนและเมนูล่างมือถือ → เปิดช่องฟัง 2 ช่อง
 * ขึ้น toast ซ้ำ 2 อัน และสั่งแจ้งเตือนระบบซ้อนกับ push จากเซิร์ฟเวอร์ จนเด้ง 3 ครั้ง (23 ก.ย. 2026)
 * แจ้งเตือนระดับระบบให้ push จากเซิร์ฟเวอร์ทำหน้าที่อย่างเดียว ที่นี่แค่ toast ในหน้าเว็บ
 */
export function useNotificationRealtime() {
  const userId = useAuthUserId();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications-${userId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as NotificationRow;
          void queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
          void queryClient.invalidateQueries({ queryKey: ["order"] });
          // id เดียวกัน = toast อันเดียว กันซ้ำแม้ช่องฟังถูกสร้างซ้อนชั่วคราว
          toast(row.title, { id: row.id, description: row.body ?? undefined });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}

export function useMarkNotificationsRead() {
  const userId = useAuthUserId();
  const queryClient = useQueryClient();
  const key = ["notifications", userId] as const;
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!ids.length) return true;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .in("id", ids)
        .is("read_at", null);
      if (error) throw new Error(error.message);
      return true;
    },
    // อัปเดตทันทีในหน้าจอ (จุดแดงหาย) โดยไม่ต้องรอเซิร์ฟเวอร์ตอบกลับ
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<NotificationRow[]>(key);
      const now = new Date().toISOString();
      queryClient.setQueryData<NotificationRow[]>(key, (old) =>
        (old ?? []).map((n) => (ids.includes(n.id) && !n.read_at ? { ...n, read_at: now } : n)),
      );
      return { previous };
    },
    onError: (_err, _ids, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
