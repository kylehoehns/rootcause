import { defineConfig } from "@playwright/test";

// Runs against the production build with the pipeline's published data (`just run` writes public/data/).
export default defineConfig({
  testDir: "e2e",
  use: { baseURL: "http://localhost:4173" },
  webServer: { command: "pnpm vite preview --port 4173 --strictPort", url: "http://localhost:4173" },
});
