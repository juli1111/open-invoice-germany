import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { prisma, dbInternal, GobdImmutabilityError } from "@/lib/db";
import { createDraftInvoice } from "@/domain/invoice/create";
import { finalizeInvoice } from "@/domain/invoice/finalize";
import { cancelInvoice } from "@/domain/invoice/cancel";
import { verifyChain, type ChainEntry } from "@/domain/changelog";
import type { CreateInvoiceInput } from "@/schemas";

let orgId: string;
let customerId: string;
const FIX_DATE = new Date("2026-06-09T10:00:00.000Z");

beforeAll(async () => {
  const org = await dbInternal.organization.create({
    data: {
      legalName: "Test GmbH",
      addressLine1: "Hauptstr. 1",
      postalCode: "21339",
      city: "Lüneburg",
      vatId: "DE123456789",
      taxNumber: "33/123/45678",
    },
  });
  orgId = org.id;
  const customer = await dbInternal.customer.create({
    data: { orgId, name: "Kunde AG", addressLine1: "Marktplatz 2", postalCode: "20095", city: "Hamburg", type: "BUSINESS" },
  });
  customerId = customer.id;
});

afterAll(async () => {
  await dbInternal.$disconnect();
});

function baseInput(extra: Partial<CreateInvoiceInput> = {}): CreateInvoiceInput {
  return {
    customerId,
    type: "INVOICE",
    taxScheme: "REGULAR",
    currency: "EUR",
    deliveryDate: new Date("2026-06-01"),
    lines: [
      { description: "Beratung", quantityMilli: 2000, unit: "HUR", unitNetPriceCents: 10000, taxRate: 19, taxCategory: "S", discountPermille: 0 },
    ],
    ...extra,
  } as CreateInvoiceInput;
}

const seqOf = (number: string | null) => Number(number!.split("-").pop());

describe("GoBD: Nummernkreis + Unveränderbarkeit", () => {
  it("Entwurf hat keine Nummer; Festschreiben vergibt fortlaufend & monoton", async () => {
    const d1 = await createDraftInvoice(orgId, baseInput());
    expect(d1.number).toBeNull();

    const f1 = await finalizeInvoice(d1.id, { now: FIX_DATE });
    const f2 = await finalizeInvoice((await createDraftInvoice(orgId, baseInput())).id, { now: FIX_DATE });

    expect(f1.number).toMatch(/^RE-2026-\d{4}$/);
    expect(seqOf(f2.number)).toBe(seqOf(f1.number) + 1);
    // Summen-Snapshot: 2 h * 100 € = 200 € netto, 19 % = 38 €, brutto 238 €
    expect(f1.netTotalCents).toBe(20000);
    expect(f1.taxTotalCents).toBe(3800);
    expect(f1.grossTotalCents).toBe(23800);
  });

  it("verworfene Entwürfe verbrauchen KEINE Nummer (kein Loch)", async () => {
    const before = await finalizeInvoice((await createDraftInvoice(orgId, baseInput())).id, { now: FIX_DATE });

    const discarded = await createDraftInvoice(orgId, baseInput());
    await prisma.invoice.delete({ where: { id: discarded.id } }); // erlaubt: Entwurf

    const after = await finalizeInvoice((await createDraftInvoice(orgId, baseInput())).id, { now: FIX_DATE });
    expect(seqOf(after.number)).toBe(seqOf(before.number) + 1);
  });

  it("blockt jede Änderung/Löschung festgeschriebener Rechnungen (Guard)", async () => {
    const fin = await finalizeInvoice((await createDraftInvoice(orgId, baseInput())).id, { now: FIX_DATE });

    await expect(prisma.invoice.update({ where: { id: fin.id }, data: { notes: "manipuliert" } })).rejects.toBeInstanceOf(
      GobdImmutabilityError,
    );
    await expect(prisma.invoice.delete({ where: { id: fin.id } })).rejects.toBeInstanceOf(GobdImmutabilityError);
    await expect(prisma.invoiceLine.deleteMany({ where: { invoiceId: fin.id } })).rejects.toBeInstanceOf(
      GobdImmutabilityError,
    );
  });

  it("erlaubt Änderung von Entwürfen", async () => {
    const draft = await createDraftInvoice(orgId, baseInput());
    const updated = await prisma.invoice.update({ where: { id: draft.id }, data: { notes: "ok" } });
    expect(updated.notes).toBe("ok");
  });

  it("storniert per Gutschrift; Original bleibt erhalten (Storno statt Löschung)", async () => {
    const fin = await finalizeInvoice((await createDraftInvoice(orgId, baseInput())).id, { now: FIX_DATE });
    const res = await cancelInvoice(fin.id, { now: FIX_DATE });

    expect(res.creditNote.type).toBe("CREDIT_NOTE");
    expect(res.creditNote.number).toMatch(/^GS-2026-\d{4}$/);
    // Betragsspiegelbild: Original + Storno = 0 (Gutschrift ist negativ)
    expect(res.creditNote.grossTotalCents).toBe(-fin.grossTotalCents);
    expect(fin.grossTotalCents + res.creditNote.grossTotalCents).toBe(0);

    const original = await prisma.invoice.findUnique({ where: { id: fin.id }, include: { lines: true } });
    expect(original!.status).toBe("CANCELLED");
    expect(original!.reversedByInvoiceId).toBe(res.creditNote.id);
    expect(original!.lines.length).toBeGreaterThan(0); // Original-Positionen unverändert vorhanden
  });

  it("hält die Audit-Hash-Chain der Organisation intakt", async () => {
    const rows = await prisma.changeLog.findMany({
      where: { orgId },
      orderBy: { id: "asc" },
      select: { prevHash: true, hash: true, entity: true, entityId: true, action: true, actor: true, at: true, diffJson: true },
    });
    const entries: ChainEntry[] = rows.map((r) => ({
      prevHash: r.prevHash,
      hash: r.hash,
      payload: {
        entity: r.entity,
        entityId: r.entityId,
        action: r.action,
        actor: r.actor,
        at: r.at.toISOString(),
        diff: JSON.parse(r.diffJson),
      },
    }));
    expect(entries.length).toBeGreaterThan(3);
    expect(verifyChain(entries).valid).toBe(true);
  });
});
