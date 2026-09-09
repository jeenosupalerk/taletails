// Build config for self-hosting on a plain Node.js server (Hostatom / Plesk).
//
//   bun run build:node      -> .output/server/index.mjs  (Node server)
//                              .output/public/*          (static assets)
//
// The default `vite.config.ts` is unchanged so the Lovable preview keeps working.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

import baseOptions from "./vite.config.options";

export default defineConfig({
  ...baseOptions,
  // Standard Nitro Node server output — runs with `node .output/server/index.mjs`
  nitro: { preset: "node-server" },
});
