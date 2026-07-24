import { defineConfig } from "vite";

export default defineConfig({
  base: "/PropertyManager/",
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    proxy: {
      "/PropertyManager/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/PropertyManager/, ""),
      },
    },
  },
});
