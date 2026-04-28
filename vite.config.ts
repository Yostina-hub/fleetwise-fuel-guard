import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
  "Surrogate-Control": "no-store",
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    strictPort: true,
    headers: noStoreHeaders,
    hmr: {
      protocol: "wss",
      clientPort: 443,
    },
    warmup: {
      clientFiles: [
        "./src/main.tsx",
        "./src/App.tsx",
        "./src/index.css",
        "./src/i18n/index.ts",
        "./src/services/storeAndForwardService.ts",
      ],
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react/jsx-dev-runtime",
      "react-dom/client",
      "react-router-dom",
      "@tanstack/react-query",
      "react-i18next",
      "i18next",
      "i18next-browser-languagedetector",
      "sonner",
      "lucide-react",
      "framer-motion",
    ],
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
}));
