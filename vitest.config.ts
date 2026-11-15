import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "tests/unit/**/*.test.{ts,tsx}",
      "tests/integration/**/*.test.{ts,tsx}",
    ],
    coverage: {
      include: ["src/lib/**"],
      reporter: ["text-summary", "lcov"],
      // Goals from AGENTS.md; CI fails below them.
      thresholds: {
        lines: 80,
        branches: 80,
        "src/lib/scheduler/**": { lines: 90, branches: 90 },
      },
    },
  },
});
