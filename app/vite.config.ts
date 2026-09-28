import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages: https://sanada-being.github.io/aws-exam-training/
export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/aws-exam-training/" : "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "AWS 認定 問題集",
        short_name: "AWS問題集",
        description: "AWS 認定試験の学習用問題集",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        start_url: ".",
        icons: [
          { src: "favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,json}"],
        // 問題データ(全試験で約16MB)は事前保存せず、開いた試験だけを保存する
        globIgnores: ["**/data/**"],
        runtimeCaching: [
          {
            // 保存済みがあればすぐ使い(オフライン可)、裏で最新に更新する
            urlPattern: ({ url }) => /\/data\/[^/]+\.json$/.test(url.pathname),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "exam-data",
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    exclude: ["**/node_modules/**", "**/tests/e2e/**"],
  },
}));
