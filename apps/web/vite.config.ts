import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("react") || id.includes("react-dom") || id.includes("react-router-dom")) return "react";
          if (id.includes("@tanstack/react-query")) return "query";
          if (id.includes("@supabase/supabase-js")) return "supabase";
          return undefined;
        }
      }
    }
  },
  server: {
    port: 5173
  }
});
