import { defineConfig } from "vitest/config";
import path from "path";

const dirname = path.dirname(new URL(import.meta.url).pathname);

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
      // Outside Next's bundler this package doesn't resolve at all (it's
      // not a real npm dependency — Next aliases it internally). Point it
      // at a no-op so server-only.ts modules (storage.ts) can be imported
      // directly in tests.
      "server-only": path.resolve(dirname, "./tests/mocks/server-only.ts"),
    },
  },
});
