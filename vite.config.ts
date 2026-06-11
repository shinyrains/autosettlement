import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }
          if (id.includes("xlsx")) {
            return "workbook-vendor";
          }
          if (id.includes("react") || id.includes("@tanstack")) {
            return "ui-vendor";
          }
          return "vendor";
        },
      },
    },
  },
});
