import { describe, it, expect } from "vitest";
import { computeTaxBreakdown } from "@/lib/tax";

describe("tax", () => {
  it("gruppiert nach Satz/Kategorie und rundet pro Gruppe (EN 16931)", () => {
    const t = computeTaxBreakdown([
      { lineNetCents: 10000, taxRate: 19, taxCategory: "S" },
      { lineNetCents: 5000, taxRate: 19, taxCategory: "S" },
      { lineNetCents: 10000, taxRate: 7, taxCategory: "S" },
    ]);
    expect(t.netTotalCents).toBe(25000);
    // 19 % von 15000 = 2850 ; 7 % von 10000 = 700
    expect(t.taxTotalCents).toBe(3550);
    expect(t.grossTotalCents).toBe(28550);
    expect(t.breakdown).toHaveLength(2);
  });

  it("Reverse Charge / 0 % erzeugt keine Steuer", () => {
    const t = computeTaxBreakdown([{ lineNetCents: 50000, taxRate: 0, taxCategory: "AE" }]);
    expect(t.taxTotalCents).toBe(0);
    expect(t.grossTotalCents).toBe(50000);
  });
});
