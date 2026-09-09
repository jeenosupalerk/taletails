// Shared Vite options used by both the default (Lovable preview) config and the
// self-hosted Node build config. Keep build behaviour identical between them.
import type { LovableViteTanstackOptions } from "@lovable.dev/vite-tanstack-config";

const options: LovableViteTanstackOptions = {
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    server: { entry: "server" },
  },
  vite: {
    // Pre-bundle these up front so Vite does not discover them mid-session and
    // trigger a dependency re-optimization reload, which shows up in the browser
    // as "Importing a module script failed." with a blank screen.
    optimizeDeps: {
      include: [
        "@tanstack/router-core",
        "@tanstack/router-core/isServer",
        "@tanstack/router-core/ssr/client",
        "@tanstack/react-router",
        "@tanstack/react-query",
        "@supabase/supabase-js",
        "seroval",
        "sonner",
        "framer-motion",
        "lucide-react",
        "qrcode",
        "date-fns",
        "clsx",
        "class-variance-authority",
        "tailwind-merge",
        "embla-carousel-react",
        "react-hook-form",
        "@hookform/resolvers/zod",
        "zod",
        "input-otp",
        "cmdk",
      ],
    },
  },
};

export default options;
