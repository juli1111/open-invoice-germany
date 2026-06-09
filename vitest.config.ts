import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./test/global-setup.ts"],
    env: {
      // Separate Test-DB (löst relativ zum Schema-Verzeichnis auf -> prisma/test.db)
      DATABASE_URL: "file:./test.db",
    },
    // SQLite verträgt keine parallelen Writer -> Test-Files seriell
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
