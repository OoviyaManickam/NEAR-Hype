import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ["buffer", "process", "stream", "util", "events"],
      globals: { Buffer: true, global: true, process: true },
    }),
  ],
  define: {
    global: "globalThis",
  },
  server: {
    proxy: {
      "/rpc": {
        target: "https://test.rpc.fastnear.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rpc/, ""),
      },
    },
  },
});
