import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    include: ["engine/__tests__/**/*.test.ts", "golden/**/*.test.ts", "lib/__tests__/**/*.test.ts"],
    exclude: ["**/__tmp_*", "**/zz*", "**/node_modules/**"],
    environment: "node",
  },
});
