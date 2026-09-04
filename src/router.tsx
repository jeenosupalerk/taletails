import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

/**
 * เมื่อมีเวอร์ชันใหม่ ไฟล์สคริปต์เดิมที่เบราว์เซอร์แคชไว้จะโหลดไม่ได้
 * ("Importing a module script failed") ให้รีเฟรชอัตโนมัติหนึ่งครั้งแทนหน้าจอว่าง
 */
function installChunkReloadGuard() {
  if (typeof window === "undefined") return;
  const KEY = "tt-chunk-reload";
  const looksLikeChunkError = (message?: string) =>
    !!message &&
    /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|ChunkLoadError/i.test(
      message,
    );

  const recover = (message?: string) => {
    if (!looksLikeChunkError(message)) return;
    if (sessionStorage.getItem(KEY)) return;
    sessionStorage.setItem(KEY, "1");
    window.location.reload();
  };

  window.addEventListener("vite:preloadError", () => recover("Importing a module script failed"));
  window.addEventListener("error", (e) => recover(e.message));
  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason as { message?: string } | string | undefined;
    recover(typeof reason === "string" ? reason : reason?.message);
  });
  window.addEventListener("load", () => sessionStorage.removeItem(KEY));
}

installChunkReloadGuard();



export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
