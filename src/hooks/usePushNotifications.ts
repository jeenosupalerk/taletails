import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  getVapidPublicKey,
  removePushSubscription,
  savePushSubscription,
  sendTestPush,
} from "@/lib/push.functions";

function cleanKey(key: string) {
  return (key ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, "");
}

function urlBase64ToUint8Array(base64: string) {
  const clean = cleanKey(base64);
  const padding = "=".repeat((4 - (clean.length % 4)) % 4);
  const raw = atob((clean + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  if (output.length !== 65 || output[0] !== 4) {
    throw new Error("คีย์แจ้งเตือนของเซิร์ฟเวอร์ไม่ถูกต้อง (VAPID public key)");
  }
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

function subscriptionUsesKey(subscription: PushSubscription, publicKey: string) {
  const currentKey = subscription.options.applicationServerKey;
  return currentKey ? keyToBase64(currentKey) === cleanKey(publicKey).replace(/=+$/, "") : false;
}

export interface PushState {
  supported: boolean;
  /** iOS ต้อง "เพิ่มลงหน้าจอโหลม" (Add to Home Screen) ก่อนจึงจะรับการแจ้งเตือนได้ */
  needsInstall: boolean;
  permission: NotificationPermission | "unsupported";
  enabled: boolean;
  busy: boolean;
  /** เบราว์เซอร์ซ่อนคำขออนุญาตไว้ (ไอคอนกระดิ่งในแถบที่อยู่) — รอผู้ใช้ไปกดอนุญาต */
  waitingPermission: boolean;
}

/** จัดการการเปิด/ปิดการแจ้งเตือนแบบ Push บนอุปกรณ์นี้ */
export function usePushNotifications() {
  const [state, setState] = useState<PushState>({
    supported: false,
    needsInstall: false,
    permission: "unsupported",
    enabled: false,
    busy: false,
    waitingPermission: false,
  });

  const save = useServerFn(savePushSubscription);
  const remove = useServerFn(removePushSubscription);
  const test = useServerFn(sendTestPush);
  const loadVapidKey = useServerFn(getVapidPublicKey);

  const subscribeCore = useCallback(async () => {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const { publicKey } = await loadVapidKey();
    // Safari/iOS ยอมรับเฉพาะ BufferSource ที่พอดี 65 ไบต์ จึงส่งเป็น ArrayBuffer ตรง ๆ
    const appServerKey = urlBase64ToUint8Array(publicKey);
    const existing = await reg.pushManager.getSubscription();
    if (existing && !subscriptionUsesKey(existing, publicKey)) {
      await existing.unsubscribe();
    }
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey.buffer.slice(
          appServerKey.byteOffset,
          appServerKey.byteOffset + appServerKey.byteLength,
        ) as ArrayBuffer,
      }));
    const json = sub.toJSON();
    await save({
      data: {
        endpoint: sub.endpoint,
        p256dh: json.keys?.["p256dh"] ?? keyToBase64(sub.getKey("p256dh")),
        auth: json.keys?.["auth"] ?? keyToBase64(sub.getKey("auth")),
        userAgent: navigator.userAgent,
      },
    });
    return sub;
  }, [loadVapidKey, save]);

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
        if (existing) {
          setState((s) => ({ ...s, enabled: true }));
          // ลงทะเบียนอุปกรณ์นี้ซ้ำเงียบ ๆ เพื่อให้ฐานข้อมูลมีข้อมูลล่าสุดเสมอ
          void subscribeCore().catch(() => undefined);
          return;
        }
        // ถ้าผู้ใช้อนุญาตแจ้งเตือนไว้แล้ว ให้เปิดรับ Push ให้อัตโนมัติ
        if (Notification.permission === "granted") {
          await subscribeCore();
          setState((s) => ({ ...s, enabled: true }));
        }
      } catch {
        /* ไม่รองรับ — ปล่อยผ่าน */
      }
    })();
  }, [subscribeCore]);

  const enable = useCallback(async () => {
    if (!state.supported) return false;
    setState((s) => ({ ...s, busy: true }));
    // Edge/Chrome อาจ "ซ่อนคำขอ" ไว้เป็นไอคอนกระดิ่งในแถบที่อยู่ — requestPermission จะรอไม่จบ
    // จนผู้ใช้ไปกดตรงนั้น ปุ่มเลยค้าง "กำลังเปิด…" (เจอจริง 23 ก.ย. 2026)
    // ถ้า 3 วินาทียังไม่ตอบ: เลิกหมุน บอกให้กดกระดิ่ง แล้วรอผลต่อเงียบ ๆ (อนุญาตเมื่อไรก็เปิดรับต่อให้เอง)
    const hintTimer = window.setTimeout(() => {
      setState((s) => ({ ...s, busy: false, waitingPermission: true }));
      toast.info("กดไอคอนกระดิ่งในแถบที่อยู่ด้านบน", {
        description: "แล้วเลือก “อนุญาต” เพื่อเปิดรับการแจ้งเตือน",
        duration: 12_000,
      });
    }, 3000);
    try {
      let permission: NotificationPermission;
      try {
        permission = await Notification.requestPermission();
      } finally {
        window.clearTimeout(hintTimer);
      }
      setState((s) => ({ ...s, permission, busy: true, waitingPermission: false }));
      if (permission !== "granted") {
        toast.error("ยังไม่ได้อนุญาตการแจ้งเตือน", {
          description: "โปรดอนุญาตการแจ้งเตือนในการตั้งค่าเบราว์เซอร์",
        });
        return false;
      }

      await subscribeCore();

      setState((s) => ({ ...s, enabled: true }));
      void test({}).catch(() => undefined);
      toast.success("เปิดรับการแจ้งเตือนแล้ว");
      return true;
    } catch (err) {
      // ข้อความจากเซิร์ฟเวอร์เป็นศัพท์เทคนิค (เช่น VAPID_PUBLIC_KEY / หน้า HTML 500) — ลูกค้าไม่ควรเห็น
      // เก็บรายละเอียดไว้ใน console ให้ผู้ดูแลตรวจ แล้วแสดงข้อความที่อ่านเข้าใจแทน
      console.error("enable push failed", err);
      toast.error("เปิดรับการแจ้งเตือนไม่สำเร็จ", {
        description: "ลองใหม่อีกครั้งภายหลัง",
      });
      return false;
    } finally {
      setState((s) => ({ ...s, busy: false }));
    }
  }, [state.supported, subscribeCore, test]);

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
