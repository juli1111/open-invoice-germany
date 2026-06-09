/**
 * Lädt eine Rechnung samt Org/Kunde/Positionen und baut die E-Rechnungs-Daten.
 * Bei Gutschrift/Korrektur wird die Vorgänger-Referenz (BG-3) mit aufgelöst.
 */
import { dbInternal } from "@/lib/db";
import { buildEInvoiceData } from "./mapper";

const INCLUDE = {
  lines: { orderBy: { position: "asc" as const } },
  org: true,
  customer: true,
} as const;

export async function loadEInvoiceData(invoiceId: string) {
  const invoice = await dbInternal.invoice.findUnique({ where: { id: invoiceId }, include: INCLUDE });
  if (!invoice) return null;

  const data = buildEInvoiceData(invoice);

  if (invoice.correctsInvoiceId) {
    const original = await dbInternal.invoice.findUnique({
      where: { id: invoice.correctsInvoiceId },
      select: { number: true, issueDate: true },
    });
    if (original) {
      data.precedingInvoiceNumber = original.number;
      data.precedingInvoiceDate = original.issueDate;
    }
  }

  return { invoice, data };
}
