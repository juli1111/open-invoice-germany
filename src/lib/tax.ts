/**
 * Umsatzsteuer-Berechnung nach EN 16931 / § 14 UStG.
 *
 * Die Steuer wird **pro Steuersatz-/Kategorie-Gruppe** berechnet (nicht je
 * Position) — so verlangt es EN 16931 (BG-23 VAT BREAKDOWN) und es vermeidet
 * Rundungsdifferenzen zwischen Summe-der-Positionen und Gesamtsteuer.
 */
import { roundHalfUp } from "./money";

/** UNTDID-5305 Steuerkategorie-Codes (Teilmenge). */
export type TaxCategory =
  | "S" // Standard rate
  | "AE" // Reverse charge (§ 13b)
  | "K" // Innergemeinschaftliche Lieferung (§ 6a)
  | "G" // Export außerhalb EU
  | "E" // Steuerbefreit (z.B. Kleinunternehmer § 19)
  | "Z"; // Nullsatz

export interface TaxLineInput {
  lineNetCents: number;
  taxRate: number; // Prozent: 19 | 7 | 0
  taxCategory: TaxCategory | string;
}

export interface TaxBreakdownEntry {
  taxCategory: string;
  taxRate: number;
  netCents: number;
  taxCents: number;
}

export interface TaxTotals {
  netTotalCents: number;
  taxTotalCents: number;
  grossTotalCents: number;
  breakdown: TaxBreakdownEntry[];
}

export function computeTaxBreakdown(lines: readonly TaxLineInput[]): TaxTotals {
  const groups = new Map<string, TaxBreakdownEntry>();

  for (const line of lines) {
    const key = `${line.taxCategory}:${line.taxRate}`;
    const existing = groups.get(key);
    if (existing) {
      existing.netCents += line.lineNetCents;
    } else {
      groups.set(key, {
        taxCategory: String(line.taxCategory),
        taxRate: line.taxRate,
        netCents: line.lineNetCents,
        taxCents: 0,
      });
    }
  }

  let netTotalCents = 0;
  let taxTotalCents = 0;
  const breakdown: TaxBreakdownEntry[] = [];

  for (const group of groups.values()) {
    group.taxCents = roundHalfUp((group.netCents * group.taxRate) / 100);
    netTotalCents += group.netCents;
    taxTotalCents += group.taxCents;
    breakdown.push(group);
  }

  breakdown.sort(
    (a, b) => a.taxCategory.localeCompare(b.taxCategory) || a.taxRate - b.taxRate,
  );

  return {
    netTotalCents,
    taxTotalCents,
    grossTotalCents: netTotalCents + taxTotalCents,
    breakdown,
  };
}

/** Steuerschemata, die eine 0-%-/befreite Behandlung erzwingen. */
export const ZERO_TAX_SCHEMES = new Set([
  "KLEINUNTERNEHMER",
  "REVERSE_CHARGE",
  "IG_LIEFERUNG",
  "IG_LEISTUNG",
]);

/** Default-Steuerkategorie je Schema (für neue Positionen/Hinweise). */
export function defaultCategoryForScheme(scheme: string): TaxCategory {
  switch (scheme) {
    case "KLEINUNTERNEHMER":
      return "E";
    case "REVERSE_CHARGE":
      return "AE";
    case "IG_LIEFERUNG":
      return "K";
    case "IG_LEISTUNG":
      return "AE";
    default:
      return "S";
  }
}
