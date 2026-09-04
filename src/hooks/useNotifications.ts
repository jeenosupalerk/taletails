import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
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

/**
 * แสดงการแจ้งเตือนระดับระบบผ่าน service worker (เด้งบนหน้าจอมือถือ/เดสก์ท็อป
 * แม้ผู้ใช้สลับแอปหรือไม่ได้เปิดหน้าเว็บค้างไว้) พร้อม fallback เป็น Notification ปกติ
 */
async function showSystemNotification(row: NotificationRow) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const options = {
    body: row.body ?? "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: row.id,
    data: { link: row.link ?? "/" },
  };
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(row.title, options);
      return;
    }
  } catch {
    /* ตกไปใช้ fallback ด้านล่าง */
  }
  if (document.visibilityState !== "visible") {
    new Notification(row.title, options);
  }
}

/** Fetches the signed-in user's notifications, live-updated via Realtime. */
export function useNotifications() {
  const userId = useAuthUserId();
  const queryClient = useQueryClient();
  const permissionAsked = useRef(false);

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

  // ลงทะเบียน service worker + ขอสิทธิ์แจ้งเตือนหนึ่งครั้ง เพื่อให้การแจ้งเตือน
  // เด้งบนหน้าจอได้แม้ผู้ใช้ไม่ได้เปิดหน้าเว็บค้างไว้
  useEffect(() => {
    if (!userId || permissionAsked.current) return;
    permissionAsked.current = true;
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    if ("Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, [userId]);

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
          toast(row.title, { description: row.body ?? undefined });
          void showSystemNotification(row);
        },
      )
      .subscribe();


    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  const items = query.data ?? [];
  return { items, unread: items.filter((n) => !n.read_at).length, isLoading: query.isLoading };
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
