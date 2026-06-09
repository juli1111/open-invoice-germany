import { describe, it, expect } from "vitest";
import { computeDunning, daysBetween, DEFAULT_BASE_RATE_BP } from "@/lib/dunning";

describe("Verzugszins (§ 288 BGB)", () => {
  it("B2B: 9 Pp über Basiszins, taggenau + 40-€-Pauschale", () => {
    const r = computeDunning({ openAmountCents: 100000, daysOverdue: 30, isConsumer: false, applyFlatFee: true });
    expect(r.pointsBp).toBe(900);
    const expectedInterest = Math.round((100000 * (DEFAULT_BASE_RATE_BP + 900) * 30) / (10000 * 365));
    expect(r.interestCents).toBe(expectedInterest);
    expect(r.flatFee40Cents).toBe(4000);
    expect(r.totalCents).toBe(100000 + expectedInterest + 4000);
  });

  it("B2C: 5 Pp, KEINE 40-€-Pauschale", () => {
    const r = computeDunning({ openAmountCents: 100000, daysOverdue: 30, isConsumer: true, applyFlatFee: true });
    expect(r.pointsBp).toBe(500);
    expect(r.flatFee40Cents).toBe(0);
  });

  it("daysBetween rechnet ganze Tage", () => {
    expect(daysBetween(new Date("2026-06-01"), new Date("2026-06-09"))).toBe(8);
  });
});
