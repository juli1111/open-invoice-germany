/**
 * Zahlungseingang erfassen. Aktualisiert paidAmount + Status (PAID /
 * PARTIALLY_PAID). Voraussetzung u. a. fürs Mahnwesen (offener Betrag).
 */
import { dbInternal } from "@/lib/db";
import { appendChangeLog } from "@/domain/audit";
import type { RecordPaymentInput } from "@/schemas";

export class PaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentError";
  }
}

export async function recordPayment(invoiceId: string, input: RecordPaymentInput, opts: { actor?: string; now?: Date } = {}) {
  const now = opts.now ?? new Date();
  const actor = opts.actor ?? "system";

  return dbInternal.$transaction(async (tx) => {
    const inv = await tx.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, status: true, type: true, grossTotalCents: true, paidAmountCents: true, orgId: true, number: true },
    });
    if (!inv) throw new PaymentError("Rechnung nicht gefunden.");
    if (inv.status === "DRAFT") throw new PaymentError("Zahlung erst nach dem Festschreiben erfassbar.");
    if (inv.status === "CANCELLED") throw new PaymentError("Die Rechnung ist storniert.");
    if (inv.type === "CREDIT_NOTE") throw new PaymentError("Zahlungen werden nur auf Rechnungen erfasst, nicht auf Gutschriften.");

    await tx.payment.create({
      data: {
        invoiceId,
        amountCents: input.amountCents,
        paidAt: input.paidAt ?? now,
        method: input.method,
        reference: input.reference ?? null,
        isSkonto: input.isSkonto,
      },
    });

    const newPaid = inv.paidAmountCents + input.amountCents;
    const status = newPaid >= inv.grossTotalCents ? "PAID" : "PARTIALLY_PAID";
    const updated = await tx.invoice.update({
      where: { id: invoiceId },
      data: { paidAmountCents: newPaid, status },
    });

    await appendChangeLog(tx, {
      orgId: inv.orgId,
      entity: "INVOICE",
      entityId: invoiceId,
      action: "UPDATE",
      actor,
      at: now,
      diff: { paymentCents: input.amountCents, paidAmountCents: newPaid, status },
    });

    return updated;
  });
}
