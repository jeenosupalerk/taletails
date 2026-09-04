/* Taletails service worker — แสดงการแจ้งเตือนแม้ผู้ใช้ไม่ได้เปิดหน้าเว็บค้างไว้ */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/** รับ Web Push จากเซิร์ฟเวอร์ (เมื่อผู้ใช้ปิดเว็บไปแล้ว) */
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Taletails", body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "Taletails";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { link: payload.link || "/" },
      tag: payload.tag || undefined,
    }),
  );
});

/** ให้หน้าเว็บสั่งแสดงการแจ้งเตือนระดับระบบได้ (ทำงานแม้แท็บอยู่พื้นหลัง) */
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "SHOW_NOTIFICATION") return;
  event.waitUntil(
    self.registration.showNotification(data.title || "Taletails", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { link: data.link || "/" },
      tag: data.tag || undefined,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      return self.clients.openWindow(link);
    }),
  );
});
