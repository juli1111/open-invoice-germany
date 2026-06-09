/**
 * Bildet eine festgeschriebene Rechnung (Prisma) auf die framework-freie
 * EInvoiceData-Struktur ab — gemeinsame Quelle für XRechnung- und PDF-Export.
 */
import type { EInvoiceData, EInvoiceTaxSubtotal } from "./types";

interface MapInput {
  number: string | null;
  type: string;
  issueDate: Date;
  dueDate: Date | null;
  deliveryDate: Date | null;
  currency: string;
  buyerReference: string | null;
  paymentTerms: string | null;
  notes: string | null;
  netTotalCents: number;
  taxTotalCents: number;
  grossTotalCents: number;
  paidAmountCents: number;
  taxBreakdownJson: string;
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
    electronicAddress: string | null;
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
    id: string;
    description: string;
    quantityMilli: number;
    unit: string;
    unitNetPriceCents: number;
    lineNetCents: number;
    taxRate: number;
    taxCategory: string;
  }>;
}

export function buildEInvoiceData(invoice: MapInput): EInvoiceData {
  const breakdown = JSON.parse(invoice.taxBreakdownJson) as EInvoiceTaxSubtotal[];

  return {
    number: invoice.number ?? "ENTWURF",
    type: invoice.type,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    deliveryDate: invoice.deliveryDate,
    currency: invoice.currency,
    buyerReference: invoice.buyerReference,
    paymentTerms: invoice.paymentTerms,
    notes: invoice.notes,
    seller: {
      name: invoice.org.legalName,
      addressLine1: invoice.org.addressLine1,
      addressLine2: invoice.org.addressLine2,
      postalCode: invoice.org.postalCode,
      city: invoice.org.city,
      countryCode: invoice.org.country,
      vatId: invoice.org.vatId,
      taxNumber: invoice.org.taxNumber,
      email: invoice.org.email,
      phone: invoice.org.phone,
      contactName: null,
      electronicAddress: invoice.org.electronicAddress,
    },
    buyer: {
      name: invoice.customer.name,
      contactName: invoice.customer.contactName,
      addressLine1: invoice.customer.addressLine1,
      addressLine2: invoice.customer.addressLine2,
      postalCode: invoice.customer.postalCode,
      city: invoice.customer.city,
      countryCode: invoice.customer.countryCode,
      vatId: invoice.customer.vatId,
      email: invoice.customer.email,
    },
    lines: invoice.lines.map((l) => ({
      id: l.id,
      description: l.description,
      quantityMilli: l.quantityMilli,
      unit: l.unit,
      unitNetPriceCents: l.unitNetPriceCents,
      lineNetCents: l.lineNetCents,
      taxRate: l.taxRate,
      taxCategory: l.taxCategory,
    })),
    taxSubtotals: breakdown,
    netTotalCents: invoice.netTotalCents,
    taxTotalCents: invoice.taxTotalCents,
    grossTotalCents: invoice.grossTotalCents,
    payableCents: invoice.grossTotalCents - invoice.paidAmountCents,
    paidCents: invoice.paidAmountCents,
    iban: invoice.org.iban,
    bic: invoice.org.bic,
    bankName: invoice.org.bankName,
  };
}
