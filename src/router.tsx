import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { LogoLoader } from "@/components/ui/logo-loader";

/**
 * เมื่อมีเวอร์ชันใหม่ ไฟล์สคริปต์เดิมที่เบราว์เซอร์แคชไว้จะโหลดไม่ได้
 * ("Importing a module script failed") ให้รีเฟรชอัตโนมัติหนึ่งครั้งแทนหน้าจอว่าง
 */
function installChunkReloadGuard() {
  if (typeof window === "undefined") return;
  const KEY = "tt-chunk-reload";
  const MAX_RETRIES = 3;
  const looksLikeChunkError = (message?: string) =>
    !!message &&
    /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|ChunkLoadError|Failed to load module script|dynamically imported module/i.test(
      message,
    );

  const recover = (message?: string) => {
    if (!looksLikeChunkError(message)) return;
    const tries = Number(sessionStorage.getItem(KEY) ?? "0");
    if (tries >= MAX_RETRIES) return;
    sessionStorage.setItem(KEY, String(tries + 1));
    window.location.reload();
  };

  window.addEventListener("vite:preloadError", () => recover("Importing a module script failed"));
  window.addEventListener("error", (e) => recover(e.message));
  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason as { message?: string } | string | undefined;
    recover(typeof reason === "string" ? reason : reason?.message);
  });
  // เคลียร์ตัวนับเมื่อหน้าโหลดสำเร็จและอยู่ได้เกิน 5 วินาที
  window.addEventListener("load", () => {
    window.setTimeout(() => sessionStorage.removeItem(KEY), 5_000);
  });

}

installChunkReloadGuard();



export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPendingMs: 150,
    defaultPendingMinMs: 400,
    defaultPendingComponent: () => (
      <div className="grid min-h-[60vh] place-items-center px-4 py-20">
        <LogoLoader size={72} label="กำลังโหลด..." />
      </div>
    ),
    defaultPreloadStaleTime: 0,
  });

  return router;
};
