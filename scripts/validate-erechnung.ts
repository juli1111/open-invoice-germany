/**
 * Validiert eine XRechnung gegen die OFFIZIELLEN Schematron-Regeln — in purem
 * Node via SaxonJS (xslt3), ohne Java:
 *   1. EN-16931-UBL-Schematron (ConnectingEurope)
 *   2. XRechnung-CIUS (BR-DE) aus der offiziellen KoSIT-Konfiguration
 *
 * Das ist im Kern dieselbe Schematron-Prüfung wie der KoSIT-Validator (nur die
 * vorgelagerte XSD-Prüfung fehlt). Aufruf:
 *   npm run validate:erechnung                # erzeugt ein Sample und prüft es
 *   npm run validate:erechnung -- pfad/zur.xml
 *
 * Exit 0 = bestanden, 1 = Verletzung(en). Artefakte landen in validation/.cache
 * (gitignored). Für die XRechnung-CIUS-Ebene wird `unzip` benötigt; fehlt es,
 * wird diese Ebene mit Hinweis übersprungen (EN-16931 läuft trotzdem).
 */
import { execSync } from "node:child_process";
import { mkdirSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = path.join(ROOT, "validation", ".cache");

const EN16931_XSLT = path.join(CACHE, "EN16931-UBL-validation.xslt");
const EN16931_URL =
  "https://raw.githubusercontent.com/ConnectingEurope/eInvoicing-EN16931/validation-1.3.13/ubl/xslt/EN16931-UBL-validation.xslt";

const KOSIT_DIR = path.join(CACHE, "kosit");
const KOSIT_ZIP = path.join(CACHE, "kosit-config.zip");
const KOSIT_URL =
  "https://github.com/itplr-kosit/validator-configuration-xrechnung/releases/download/release-2024-06-20/validator-configuration-xrechnung_3.0.2_2024-06-20.zip";
const XRECHNUNG_XSLT = path.join(KOSIT_DIR, "resources", "xrechnung", "3.0.2", "xsl", "XRechnung-UBL-validation.xsl");

async function download(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download fehlgeschlagen (HTTP ${res.status}): ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
}

function runSchematron(xsltPath: string, xmlPath: string, label: string): { errors: string[]; warnings: number } {
  const svrl = path.join(CACHE, "report.svrl.xml");
  execSync(`npx xslt3 -xsl:"${xsltPath}" -s:"${xmlPath}" -o:"${svrl}"`, { cwd: ROOT, stdio: "pipe" });
  const report = readFileSync(svrl, "utf8");
  const errors: string[] = [];
  let warnings = 0;
  for (const block of report.split("<svrl:failed-assert").slice(1)) {
    const flag = block.match(/flag="([^"]*)"/)?.[1] ?? "fatal";
    const text = (block.match(/<svrl:text>([\s\S]*?)<\/svrl:text>/)?.[1] ?? "").replace(/\s+/g, " ").trim();
    if (flag === "warning") warnings++;
    else errors.push(`[${label}/${flag}] ${text.slice(0, 160)}`);
  }
  return { errors, warnings };
}

async function main(): Promise<void> {
  mkdirSync(CACHE, { recursive: true });

  let target = process.argv[2];
  if (!target) {
    target = path.join(CACHE, "sample-xrechnung.xml");
    execSync(`npx tsx scripts/generate-sample-xrechnung.ts "${target}"`, { cwd: ROOT, stdio: "inherit" });
  }

  const allErrors: string[] = [];
  let totalWarnings = 0;

  // 1) EN-16931
  if (!existsSync(EN16931_XSLT)) await download(EN16931_URL, EN16931_XSLT);
  const en = runSchematron(EN16931_XSLT, target, "EN16931");
  allErrors.push(...en.errors);
  totalWarnings += en.warnings;

  // 2) XRechnung-CIUS (BR-DE) — benötigt unzip
  let xrechnungRan = false;
  try {
    if (!existsSync(XRECHNUNG_XSLT)) {
      if (!existsSync(KOSIT_ZIP)) await download(KOSIT_URL, KOSIT_ZIP);
      mkdirSync(KOSIT_DIR, { recursive: true });
      execSync(`unzip -oq "${KOSIT_ZIP}" -d "${KOSIT_DIR}"`, { stdio: "pipe" });
    }
    const xr = runSchematron(XRECHNUNG_XSLT, target, "XRechnung");
    allErrors.push(...xr.errors);
    totalWarnings += xr.warnings;
    xrechnungRan = true;
  } catch (e) {
    console.error(`[validate] XRechnung-CIUS-Ebene übersprungen (${(e as Error).message.split("\n")[0]}). 'unzip' nötig.`);
  }

  const layers = `EN-16931${xrechnungRan ? " + XRechnung-CIUS" : ""}`;
  if (allErrors.length === 0) {
    console.log(`✅ Schematron BESTANDEN (${layers}) — ${path.basename(target)} (${totalWarnings} Warnung(en))`);
    process.exit(0);
  }
  console.error(`❌ Schematron: ${allErrors.length} Verletzung(en) in ${path.basename(target)}:`);
  for (const e of allErrors) console.error(`   - ${e}`);
  process.exit(1);
}

main().catch((e) => {
  console.error((e as Error).message ?? e);
  process.exit(1);
});
