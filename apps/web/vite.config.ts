import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // injectManifest because the SW is hand-written (push + notificationclick);
      // generateSW cannot express those handlers.
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      injectRegister: "auto",
      // Lets the SW be debugged against `vite dev` rather than only prod builds.
      devOptions: { enabled: true, type: "module" },
      injectManifest: {
        // App shell only. API responses must never be precached.
        globPatterns: ["**/*.{js,css,html,svg,png,woff,woff2}"]
      },
      includeAssets: ["favicon.svg", "apple-touch-icon.png", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "Harmonics",
        short_name: "Harmonics",
        description: "Plan the day, track the routine, learn from the pattern.",
        // "standalone" is required for iOS to allow web push at all.
        display: "standalone",
        start_url: "/dashboard",
        scope: "/",
        background_color: "#fdf6ec",
        theme_color: "#8c2f18",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      }
    })
  ],
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
