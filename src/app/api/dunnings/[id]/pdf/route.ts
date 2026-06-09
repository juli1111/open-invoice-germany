import { dbInternal } from "@/lib/db";
import { renderDunningPdf } from "@/lib/pdf/dunning-pdf";
import { daysBetween } from "@/lib/dunning";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const d = await dbInternal.dunning.findUnique({
    where: { id },
    include: { invoice: { include: { org: true, customer: true } } },
  });
  if (!d) return new Response("Mahnung nicht gefunden", { status: 404 });

  const inv = d.invoice;
  const open = inv.grossTotalCents - inv.paidAmountCents;
  const dueDate = inv.dueDate ?? inv.issueDate;

  const pdf = await renderDunningPdf({
    number: d.number ?? "",
    level: d.level,
    sentDate: d.sentAt,
    newDueDate: d.dueDate ?? d.sentAt,
    currency: inv.currency,
    seller: {
      name: inv.org.legalName,
      addressLine1: inv.org.addressLine1,
      postalCode: inv.org.postalCode,
      city: inv.org.city,
      taxNumber: inv.org.taxNumber,
      vatId: inv.org.vatId,
      iban: inv.org.iban,
      bic: inv.org.bic,
      bankName: inv.org.bankName,
    },
    buyer: {
      name: inv.customer.name,
      contactName: inv.customer.contactName,
      addressLine1: inv.customer.addressLine1,
      addressLine2: inv.customer.addressLine2,
      postalCode: inv.customer.postalCode,
      city: inv.customer.city,
    },
    invoiceNumber: inv.number ?? "",
    invoiceDate: inv.issueDate,
    openAmountCents: open,
    interestCents: d.interestAmountCents,
    flatFee40Cents: d.flatFee40Cents,
    lateFeeCents: d.lateFeeCents,
    totalCents: open + d.interestAmountCents + d.flatFee40Cents + d.lateFeeCents,
    daysOverdue: daysBetween(dueDate, d.sentAt),
  });

  const safe = (d.number ?? "mahnung").replace(/[^A-Za-z0-9._-]/g, "_");
  return new Response(new Uint8Array(pdf), {
    headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${safe}.pdf"` },
  });
}
