import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const backendTarget = process.env.VITE_API_URL || process.env.VITE_API_BASE || "http://localhost:8000";

export default defineConfig({
  root: path.resolve(__dirname, "frontend"),
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": backendTarget,
      "/health": backendTarget,
    },
  },
  build: {
    outDir: path.resolve(__dirname, "frontend/dist"),
    emptyOutDir: true,
  },
});
