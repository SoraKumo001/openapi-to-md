import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    typecheck: {
      enabled: true,
    },
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      reporter: ["text", "html"],
      reportsDirectory: "./test/coverage",
    },
  },
});
