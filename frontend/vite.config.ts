/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy) => {
          // Disable response buffering so SSE chunks flow through immediately
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['x-accel-buffering'] = 'no';
          });
        },
      },
    },
  },
  plugins: [react()],
  // Pre-bundle libraries that are only imported lazily. Otherwise the dev server discovers them on
  // first use, re-optimizes, and force-reloads the page — wiping in-progress input and streams.
  optimizeDeps: {
    include: ['react-markdown', 'remark-gfm', 'prism-react-renderer', 'pdfjs-dist', 'mammoth', 'jspdf', 'html2canvas', 'docx'],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
