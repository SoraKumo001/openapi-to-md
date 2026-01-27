import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    typecheck: {
      enabled: true,
    },
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/types.ts"],
      reporter: ["text", "html"],
      reportsDirectory: "./test/coverage",
    },
  },
});
