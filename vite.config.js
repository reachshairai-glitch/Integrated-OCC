import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative asset paths so the build works at any URL subpath
  // (e.g. https://<user>.github.io/<repo>/ on GitHub Pages).
  base: "./",
  plugins: [react()],
  server: { port: 5174, open: false },
});
