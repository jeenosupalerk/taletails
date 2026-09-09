import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { removePushSubscription, savePushSubscription, sendTestPush } from "@/lib/push.functions";

/** VAPID public key (เปิดเผยได้ — ใช้จับคู่กับ private key ที่เก็บเป็น secret ฝั่งเซิร์ฟเวอร์) */
export const VAPID_PUBLIC_KEY =
  "BKk34f_b4ezyzSRnfz_cqkWg_xvSOEbAU3iJgv8YlLNvhv5-tvjYJgU8WbUCq2MdFr-pOtxq6fmDbF36mXPhQKQ";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

function keyToBase64(key: ArrayBuffer | null) {
  if (!key) return "";
  const bytes = new Uint8Array(key);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export interface PushState {
  supported: boolean;
  /** iOS ต้อง "เพิ่มลงหน้าจอโหลม" (Add to Home Screen) ก่อนจึงจะรับการแจ้งเตือนได้ */
  needsInstall: boolean;
  permission: NotificationPermission | "unsupported";
  enabled: boolean;
  busy: boolean;
}

/** จัดการการเปิด/ปิดการแจ้งเตือนแบบ Push บนอุปกรณ์นี้ */
export function usePushNotifications() {
  const [state, setState] = useState<PushState>({
    supported: false,
    needsInstall: false,
    permission: "unsupported",
    enabled: false,
    busy: false,
  });

  const save = useServerFn(savePushSubscription);
  const remove = useServerFn(removePushSubscription);
  const test = useServerFn(sendTestPush);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const supported =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;

    setState((s) => ({
      ...s,
      supported,
      needsInstall: isIos && !standalone,
      permission: supported ? Notification.permission : "unsupported",
    }));

    if (!supported) return;
    void (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const existing = await reg.pushManager.getSubscription();
        setState((s) => ({ ...s, enabled: Boolean(existing) }));
      } catch {
        /* ไม่รองรับ — ปล่อยผ่าน */
      }
    })();
  }, []);

  const enable = useCallback(async () => {
    if (!state.supported) return false;
    setState((s) => ({ ...s, busy: true }));
    try {
      const permission = await Notification.requestPermission();
      setState((s) => ({ ...s, permission }));
      if (permission !== "granted") {
        toast.error("ยังไม่ได้อนุญาตการแจ้งเตือน", {
          description: "โปรดอนุญาตการแจ้งเตือนในการตั้งค่าเบราว์เซอร์",
        });
        return false;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));

      const json = sub.toJSON();
      await save({
        data: {
          endpoint: sub.endpoint,
          p256dh: json.keys?.['p256dh'] ?? keyToBase64(sub.getKey("p256dh")),
          auth: json.keys?.['auth'] ?? keyToBase64(sub.getKey("auth")),
          userAgent: navigator.userAgent,
        },
      });

      setState((s) => ({ ...s, enabled: true }));
      void test({}).catch(() => undefined);
      toast.success("เปิดรับการแจ้งเตือนแล้ว");
      return true;
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      // เซิร์ฟเวอร์บางครั้งตอบกลับเป็นหน้า HTML ของ Apache (500) — อย่านำมาแสดงดิบ ๆ
      const looksLikeHtml = /<html|<!DOCTYPE/i.test(raw);
      toast.error("เปิดรับการแจ้งเตือนไม่สำเร็จ", {
        description: looksLikeHtml
          ? "เซิร์ฟเวอร์ตอบกลับผิดพลาด (500) โปรดลองอีกครั้งภายหลัง"
          : raw || undefined,
      });
      return false;
    } finally {
      setState((s) => ({ ...s, busy: false }));
    }
  }, [save, state.supported, test]);

  const disable = useCallback(async () => {
    setState((s) => ({ ...s, busy: true }));
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await remove({ data: { endpoint: sub.endpoint } }).catch(() => undefined);
        await sub.unsubscribe();
      }
      setState((s) => ({ ...s, enabled: false }));
      toast.success("ปิดการแจ้งเตือนบนอุปกรณ์นี้แล้ว");
    } finally {
      setState((s) => ({ ...s, busy: false }));
    }
  }, [remove]);

  return { ...state, enable, disable };
}
