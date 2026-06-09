/**
 * Festschreiben einer Rechnung (DRAFT → FINALIZED).
 *
 * Reihenfolge in EINER Transaktion:
 *   1. Pflichtangaben prüfen (§ 14 UStG)  → bei Fehlern Abbruch, Nummer wird NICHT vergeben
 *   2. Summen + Steueraufschlüsselung neu berechnen (Snapshot)
 *   3. Belegnummer transaktional aus dem Nummernkreis vergeben (lückenlos, kein "Loch" durch Entwürfe)
 *   4. Status auf FINALIZED, Nummer + finalizedAt setzen
 *   5. FINALIZE-Eintrag in die Hash-Chain
 *
 * Nach dem Festschreiben blockt der Guard in src/lib/db.ts jede direkte Änderung.
 */
import { Prisma } from "@/generated/prisma/client";
import { dbInternal } from "@/lib/db";
import { computeTaxBreakdown } from "@/lib/tax";
import { defaultPrefix, formatDocumentNumber } from "@/domain/numbering";
import { appendChangeLog } from "@/domain/audit";
import { validateMandatoryFields } from "./mandatory";

export class FinalizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinalizeError";
  }
}

export interface FinalizeOptions {
  actor?: string;
  now?: Date;
  /** Kleinbetragsrechnung (§ 33 UStDV, ≤ 250 € brutto) — reduzierte Pflichtangaben. */
  isSmallAmount?: boolean;
}

export async function finalizeWithinTx(
  tx: Prisma.TransactionClient,
  invoiceId: string,
  opts: FinalizeOptions = {},
) {
  const now = opts.now ?? new Date();
  const actor = opts.actor ?? "system";

  const invoice = await tx.invoice.findUnique({
    where: { id: invoiceId },
    include: { lines: { orderBy: { position: "asc" } }, org: true, customer: true },
  });
  if (!invoice) throw new FinalizeError("Rechnung nicht gefunden.");
  if (invoice.status !== "DRAFT")
    throw new FinalizeError(`Nur Entwürfe können festgeschrieben werden (Status: ${invoice.status}).`);

  // 1) Pflichtangaben
  const problems = validateMandatoryFields({
    type: invoice.type,
    taxScheme: invoice.taxScheme,
    issueDate: invoice.issueDate ?? now,
    deliveryDate: invoice.deliveryDate,
    deliveryStart: invoice.deliveryStart,
    deliveryEnd: invoice.deliveryEnd,
    notes: invoice.notes,
    isSmallAmount: opts.isSmallAmount,
    lines: invoice.lines.map((l) => ({
      description: l.description,
      quantityMilli: l.quantityMilli,
      taxRate: l.taxRate,
      taxCategory: l.taxCategory,
    })),
    org: invoice.org,
    customer: invoice.customer,
  });
  if (problems.length > 0) {
    throw new FinalizeError("Pflichtangaben unvollständig:\n- " + problems.join("\n- "));
  }

  // 2) Summen-Snapshot
  const totals = computeTaxBreakdown(
    invoice.lines.map((l) => ({ lineNetCents: l.lineNetCents, taxRate: l.taxRate, taxCategory: l.taxCategory })),
  );

  // 3) Atomarer Status-Claim: nur wenn noch DRAFT. Verhindert unter Nebenläufigkeit
  //    (Postgres READ COMMITTED) doppelte Festschreibung + doppelten Nummern-Verbrauch.
  const claim = await tx.invoice.updateMany({
    where: { id: invoiceId, status: "DRAFT" },
    data: {
      status: "FINALIZED",
      finalizedAt: now,
      issueDate: invoice.issueDate ?? now,
      netTotalCents: totals.netTotalCents,
      taxTotalCents: totals.taxTotalCents,
      grossTotalCents: totals.grossTotalCents,
      taxBreakdownJson: JSON.stringify(totals.breakdown),
    },
  });
  if (claim.count === 0) {
    throw new FinalizeError("Rechnung wurde zwischenzeitlich bereits festgeschrieben.");
  }

  // 4) Nummer ERST nach gewonnenem Claim vergeben -> der Verlierer verbraucht keine Nummer (kein Loch).
  const docType = invoice.type === "CREDIT_NOTE" ? "CREDIT_NOTE" : "INVOICE";
  const year = now.getFullYear();
  const range = await tx.numberRange.upsert({
    where: { orgId_docType_year: { orgId: invoice.orgId, docType, year } },
    create: { orgId: invoice.orgId, docType, year, currentValue: 1, prefix: defaultPrefix(docType) },
    update: { currentValue: { increment: 1 } },
  });
  const number = formatDocumentNumber(range.pattern, {
    prefix: range.prefix || defaultPrefix(docType),
    seq: range.currentValue,
    padding: range.seqPadding,
    year,
    month: now.getMonth() + 1,
  });
  await tx.invoice.update({ where: { id: invoiceId }, data: { number } });

  // 5) Audit
  await appendChangeLog(tx, {
    orgId: invoice.orgId,
    entity: "INVOICE",
    entityId: invoiceId,
    action: "FINALIZE",
    actor,
    at: now,
    diff: { number, status: "FINALIZED", grossTotalCents: totals.grossTotalCents },
  });

  const result = await tx.invoice.findUnique({
    where: { id: invoiceId },
    include: { lines: { orderBy: { position: "asc" } }, org: true, customer: true },
  });
  return result!;
}

export async function finalizeInvoice(invoiceId: string, opts: FinalizeOptions = {}) {
  return dbInternal.$transaction((tx) => finalizeWithinTx(tx, invoiceId, opts));
}
