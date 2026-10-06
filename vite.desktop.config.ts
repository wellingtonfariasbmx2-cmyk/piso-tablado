import { dirname, resolve } from "node:path";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.PISO_OUT ? resolve(root, process.env.PISO_OUT) : resolve(root, "dist-desktop");

export default defineConfig({
  root: resolve(root, "desktop"),
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "sem-grok",
      closeBundle() {
        rmSync(resolve(outDir, "__grok"), { recursive: true, force: true });
      },
    },
  ],
  resolve: {
    alias: { "@": resolve(root, "src") },
  },
  publicDir: resolve(root, "public"),
  base: process.env.PISO_BASE || "./",
  build: {
    outDir,
    emptyOutDir: true,
    assetsDir: "assets",
  },
});
