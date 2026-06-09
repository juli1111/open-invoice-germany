import { describe, it, expect } from "vitest";
import { formatDocumentNumber, defaultPrefix } from "@/domain/numbering";

describe("numbering", () => {
  it("formatiert das Standard-Pattern", () => {
    expect(
      formatDocumentNumber("{PREFIX}{YYYY}-{SEQ}", { prefix: "RE-", seq: 7, padding: 4, year: 2026, month: 6 }),
    ).toBe("RE-2026-0007");
  });

  it("unterstützt Kurzjahr + Monat", () => {
    expect(
      formatDocumentNumber("{PREFIX}{YY}{MM}-{SEQ}", { prefix: "X", seq: 42, padding: 3, year: 2026, month: 6 }),
    ).toBe("X2606-042");
  });

  it("liefert Default-Präfixe je Belegart", () => {
    expect(defaultPrefix("INVOICE")).toBe("RE-");
    expect(defaultPrefix("CREDIT_NOTE")).toBe("GS-");
  });
});
