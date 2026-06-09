import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

/**
 * Setzt vor dem Testlauf eine frische Test-DB (prisma/test.db) auf:
 * alte Datei löschen + Migrationen anwenden (`migrate deploy` ist der
 * nicht-destruktive Production-Apply).
 *
 * DATABASE_URL wird explizit gesetzt; dotenv in prisma.config.ts überschreibt
 * bereits gesetzte Variablen NICHT, daher gewinnt der Test-Pfad. Der Pfad löst
 * relativ zum Schema-Verzeichnis auf -> prisma/test.db.
 */
export default function setup() {
  rmSync("prisma/test.db", { force: true });
  rmSync("prisma/test.db-journal", { force: true });
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
  });
}
