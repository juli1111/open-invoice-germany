import { describe, it, expect } from "vitest";
import { validateMandatoryFields, type MandatoryInvoice } from "@/domain/invoice/mandatory";

const org = { legalName: "A GmbH", addressLine1: "Str 1", postalCode: "12345", city: "X", vatId: "DE123456789" };
const customer = { name: "Kunde", addressLine1: "Y 2", postalCode: "54321", city: "Z" };

function inv(extra: Partial<MandatoryInvoice> = {}): MandatoryInvoice {
  return {
    type: "INVOICE",
    taxScheme: "REGULAR",
    issueDate: new Date("2026-06-09"),
    deliveryDate: new Date("2026-06-01"),
    notes: "",
    lines: [{ description: "Leistung", quantityMilli: 1000, taxRate: 19, taxCategory: "S" }],
    org,
    customer,
    ...extra,
  };
}

describe("§ 14 Pflichtangaben", () => {
  it("vollständige Rechnung ist ok", () => {
    expect(validateMandatoryFields(inv())).toEqual([]);
  });

  it("erkennt fehlende Empfängeranschrift", () => {
    const problems = validateMandatoryFields(inv({ customer: { name: "K", addressLine1: "", postalCode: "", city: "" } }));
    expect(problems.join(" ")).toMatch(/Anschrift des Leistungsempfängers/);
  });

  it("erkennt fehlende Steuernummer/USt-IdNr. des Ausstellers", () => {
    const problems = validateMandatoryFields(inv({ org: { ...org, vatId: undefined, taxNumber: undefined } }));
    expect(problems.join(" ")).toMatch(/Steuernummer oder USt-IdNr/);
  });

  it("Reverse Charge ohne Hinweis und mit USt > 0 schlägt fehl", () => {
    const problems = validateMandatoryFields(inv({ taxScheme: "REVERSE_CHARGE", notes: "" }));
    expect(problems.join(" ")).toMatch(/Pflichthinweis für Schema REVERSE_CHARGE/);
    expect(problems.join(" ")).toMatch(/USt-Satz > 0/);
  });

  it("Reverse Charge korrekt (Hinweis + 0 %) ist ok", () => {
    const problems = validateMandatoryFields(
      inv({
        taxScheme: "REVERSE_CHARGE",
        notes: "Steuerschuldnerschaft des Leistungsempfängers",
        lines: [{ description: "Leistung", quantityMilli: 1000, taxRate: 0, taxCategory: "AE" }],
      }),
    );
    expect(problems).toEqual([]);
  });

  it("Kleinbetragsrechnung erlaubt fehlende Empfängerangaben (§ 33 UStDV)", () => {
    const problems = validateMandatoryFields(
      inv({ isSmallAmount: true, customer: { name: "", addressLine1: "", postalCode: "", city: "" } }),
    );
    expect(problems).toEqual([]);
  });
});
