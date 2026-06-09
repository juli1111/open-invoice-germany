/**
 * EN-16931-Kernregel-Validierung (pure JS, ohne Java).
 *
 * Prüft die geschäftskritischen Regeln (Pflichtfelder BR-01..BR-10/16/23/25 +
 * Rechenregeln BR-CO-10/13/14/15/16, BR-S-08) gegen die erzeugte XRechnung.
 * Das ist KEIN Ersatz für die vollständige KoSIT-/Schematron-Validierung —
 * diese läuft autoritativ im CI (.github/workflows/ci.yml mit dem offiziellen
 * KoSIT-Validator). Lokal hält dieser Check die wichtigsten Fehler ab.
 */
import { create } from "xmlbuilder2";
import { roundHalfUp } from "@/lib/money";
import type { EInvoiceData } from "./types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function money(cents: number): string {
  return (cents / 100).toFixed(2);
}

function extractAmount(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<cbc:${tag}[^>]*>([^<]+)</cbc:${tag}>`));
  return match ? match[1] : null;
}

export function validateXRechnung(data: EInvoiceData, xml: string): ValidationResult {
  const errors: string[] = [];

  // Wohlgeformtheit
  try {
    create(xml);
  } catch (e) {
    errors.push("XML ist nicht wohlgeformt: " + (e as Error).message);
  }

  // Pflichtfelder (EN 16931 BR-01..BR-10)
  if (!xml.includes("CustomizationID")) errors.push("BR-01: CustomizationID (Spezifikationskennung) fehlt.");
  if (!data.number) errors.push("BR-02: Rechnungsnummer fehlt.");
  if (!data.issueDate) errors.push("BR-03: Ausstellungsdatum fehlt.");
  if (!data.currency) errors.push("BR-05: Währungscode fehlt.");
  if (!data.seller.name) errors.push("BR-06: Name des Verkäufers fehlt.");
  if (!data.seller.addressLine1 || !data.seller.city || !data.seller.postalCode || !data.seller.countryCode)
    errors.push("BR-08: Postanschrift des Verkäufers unvollständig.");
  if (!data.buyer.name) errors.push("BR-07: Name des Käufers fehlt.");
  if (!data.buyer.addressLine1 || !data.buyer.city || !data.buyer.postalCode || !data.buyer.countryCode)
    errors.push("BR-10: Postanschrift des Käufers unvollständig.");
  if (data.lines.length === 0) errors.push("BR-16: Mindestens eine Rechnungsposition erforderlich.");
  if (data.taxSubtotals.length === 0) errors.push("BR-CO-18: Mindestens eine USt-Aufschlüsselungsgruppe erforderlich.");

  data.lines.forEach((line, i) => {
    if (!line.description) errors.push(`BR-25: Position ${i + 1} ohne Bezeichnung.`);
    if (!line.unit) errors.push(`BR-23: Position ${i + 1} ohne Mengeneinheit.`);
  });

  // Rechenregeln
  const lineSum = data.lines.reduce((s, l) => s + l.lineNetCents, 0);
  if (lineSum !== data.netTotalCents)
    errors.push(`BR-CO-10: Σ Positionsnetto (${lineSum}) ≠ Summe Positionsbeträge (${data.netTotalCents}).`);

  const subNet = data.taxSubtotals.reduce((s, t) => s + t.netCents, 0);
  const subTax = data.taxSubtotals.reduce((s, t) => s + t.taxCents, 0);
  if (subNet !== data.netTotalCents)
    errors.push(`BR-CO-13: Σ steuerbare Beträge (${subNet}) ≠ Nettogesamtbetrag (${data.netTotalCents}).`);
  if (subTax !== data.taxTotalCents)
    errors.push(`BR-CO-14: Σ Steuerbeträge (${subTax}) ≠ Gesamtsteuerbetrag (${data.taxTotalCents}).`);

  for (const t of data.taxSubtotals) {
    const expected = roundHalfUp((t.netCents * t.taxRate) / 100);
    if (expected !== t.taxCents)
      errors.push(`BR-S-08: Steuer für Kategorie ${t.taxCategory}/${t.taxRate}% erwartet ${expected}, ist ${t.taxCents}.`);
  }

  if (data.grossTotalCents !== data.netTotalCents + data.taxTotalCents)
    errors.push("BR-CO-15: Bruttobetrag ≠ Nettobetrag + Gesamtsteuer.");

  const expectedPayable = data.grossTotalCents - (data.paidCents ?? 0);
  if (data.payableCents !== expectedPayable)
    errors.push("BR-CO-16: Zahlbetrag ≠ Bruttobetrag − Anzahlung.");

  // XML-Querprüfung: bindet die Validierung an die tatsächliche Ausgabe
  const payableInXml = extractAmount(xml, "PayableAmount");
  if (payableInXml !== money(data.payableCents))
    errors.push(`XML: PayableAmount (${payableInXml}) ≠ erwartet ${money(data.payableCents)}.`);

  return { valid: errors.length === 0, errors };
}
