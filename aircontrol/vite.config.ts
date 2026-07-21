import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api/city":       "http://localhost:8001",
      "/api/ml":         "http://localhost:8002",
      "/api/localities": "http://localhost:8003",
      "/api/history":    "http://localhost:8004",
      "/api/advisory":   "http://localhost:8005",
      "/api/trip":       "http://localhost:8006",
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
