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
  build: {
    rolldownOptions: {
      output: {
        // Rarely-changing framework/UI code gets its own long-cached chunks, so an app deploy
        // only invalidates the (small) app chunk. Lazy features keep their automatic split chunks.
        codeSplitting: {
          groups: [
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom|@remix-run)[\\/]/,
              priority: 20,
            },
            {
              name: 'ui',
              test: /node_modules[\\/](@radix-ui|@floating-ui|lucide-react|next-themes|class-variance-authority|clsx|tailwind-merge)[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
