/**
 * Belegnummern-Formatierung (rein, ohne DB).
 *
 * Rechtlich (§ 14 Abs. 4 Nr. 4 UStG / UStAE 14.5 Abs. 10): Die Rechnungsnummer
 * muss **fortlaufend und einmalig** sein — eine **lückenlose** Folge ist NICHT
 * vorgeschrieben. Mehrere Nummernkreise (Jahr/Monat/Filiale) sind zulässig.
 * Die transaktionale Vergabe (kein "Loch" durch verworfene Entwürfe) lebt in
 * src/domain/invoice/finalize.ts.
 */

export interface NumberPatternContext {
  prefix: string;
  seq: number;
  padding: number;
  year: number;
  month: number;
}

const DOC_TYPE_DEFAULT_PREFIX: Record<string, string> = {
  INVOICE: "RE-",
  CREDIT_NOTE: "GS-",
  QUOTE: "AN-",
  DUNNING: "MA-",
};

export function defaultPrefix(docType: string): string {
  return DOC_TYPE_DEFAULT_PREFIX[docType] ?? "";
}

/**
 * Setzt ein Nummern-Pattern auf. Platzhalter:
 *   {PREFIX} {YYYY} {YY} {MM} {SEQ}
 */
export function formatDocumentNumber(pattern: string, ctx: NumberPatternContext): string {
  return pattern
    .replace(/\{PREFIX\}/g, ctx.prefix)
    .replace(/\{YYYY\}/g, String(ctx.year).padStart(4, "0"))
    .replace(/\{YY\}/g, String(ctx.year % 100).padStart(2, "0"))
    .replace(/\{MM\}/g, String(ctx.month).padStart(2, "0"))
    .replace(/\{SEQ\}/g, String(ctx.seq).padStart(ctx.padding, "0"));
}
