import { defineConfig } from "vite";

export default defineConfig({
  // PropertyManager is mounted at /PropertyManager/ in local and production
  // Apache deployments. Relative assets also keep development builds portable.
  base: "./",
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
    },
  },
});
