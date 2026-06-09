/**
 * Bildet ein Geschäftsdokument (Quote) auf die EInvoiceData-Struktur ab, damit
 * der PDF-Renderer wiederverwendet werden kann. Bei Proforma wird der gesetzlich
 * gebotene Hinweis ergänzt.
 */
import { computeTaxBreakdown } from "@/lib/tax";
import type { EInvoiceData } from "@/lib/einvoice/types";

const PROFORMA_NOTE = "Proforma-Rechnung — keine Rechnung im Sinne des § 14 UStG. Berechtigt nicht zum Vorsteuerabzug.";

interface DocInput {
  number: string | null;
  kind: string;
  issueDate: Date;
  currency: string;
  notes: string | null;
  org: {
    legalName: string;
    addressLine1: string;
    addressLine2: string | null;
    postalCode: string;
    city: string;
    country: string;
    vatId: string | null;
    taxNumber: string | null;
    email: string | null;
    phone: string | null;
    iban: string | null;
    bic: string | null;
    bankName: string | null;
  };
  customer: {
    name: string;
    contactName: string | null;
    addressLine1: string;
    addressLine2: string | null;
    postalCode: string;
    city: string;
    countryCode: string;
    vatId: string | null;
    email: string | null;
  };
  lines: Array<{
    description: string;
    quantityMilli: number;
    unit: string;
    unitNetPriceCents: number;
    lineNetCents: number;
    taxRate: number;
    taxCategory: string;
  }>;
}

export function buildDocEInvoiceData(q: DocInput): EInvoiceData {
  const totals = computeTaxBreakdown(
    q.lines.map((l) => ({ lineNetCents: l.lineNetCents, taxRate: l.taxRate, taxCategory: l.taxCategory })),
  );
  const notes = q.kind === "PROFORMA" ? `${PROFORMA_NOTE}${q.notes ? " " + q.notes : ""}` : q.notes;

  return {
    number: q.number ?? "ENTWURF",
    type: q.kind,
    issueDate: q.issueDate,
    dueDate: null,
    deliveryDate: null,
    currency: q.currency,
    buyerReference: null,
    paymentTerms: null,
    notes,
    seller: {
      name: q.org.legalName,
      addressLine1: q.org.addressLine1,
      addressLine2: q.org.addressLine2,
      postalCode: q.org.postalCode,
      city: q.org.city,
      countryCode: q.org.country,
      vatId: q.org.vatId,
      taxNumber: q.org.taxNumber,
      email: q.org.email,
      phone: q.org.phone,
      contactName: null,
      electronicAddress: null,
    },
    buyer: {
      name: q.customer.name,
      contactName: q.customer.contactName,
      addressLine1: q.customer.addressLine1,
      addressLine2: q.customer.addressLine2,
      postalCode: q.customer.postalCode,
      city: q.customer.city,
      countryCode: q.customer.countryCode,
      vatId: q.customer.vatId,
      email: q.customer.email,
    },
    lines: q.lines.map((l, i) => ({
      id: String(i + 1),
      description: l.description,
      quantityMilli: l.quantityMilli,
      unit: l.unit,
      unitNetPriceCents: l.unitNetPriceCents,
      lineNetCents: l.lineNetCents,
      taxRate: l.taxRate,
      taxCategory: l.taxCategory,
    })),
    taxSubtotals: totals.breakdown,
    netTotalCents: totals.netTotalCents,
    taxTotalCents: totals.taxTotalCents,
    grossTotalCents: totals.grossTotalCents,
    payableCents: totals.grossTotalCents,
    paidCents: 0,
    iban: q.org.iban,
    bic: q.org.bic,
    bankName: q.org.bankName,
  };
}
