import { describe, it, expect } from "vitest";
import {
  computeLineNetCents,
  parseEuroToCents,
  formatCents,
  roundHalfUp,
  parseQuantityToMilli,
} from "@/lib/money";

describe("money", () => {
  it("rundet kaufmännisch (half-up, symmetrisch)", () => {
    expect(roundHalfUp(2.5)).toBe(3);
    expect(roundHalfUp(-2.5)).toBe(-3);
    expect(roundHalfUp(2.4)).toBe(2);
  });

  it("computeLineNetCents berücksichtigt Menge und Rabatt", () => {
    // 2,5 h * 100,00 € = 250,00 €
    expect(computeLineNetCents(2500, 10000)).toBe(25000);
    // mit 10 % Rabatt
    expect(computeLineNetCents(2500, 10000, 100)).toBe(22500);
  });

  it("parseEuroToCents akzeptiert DE- und EN-Format", () => {
    expect(parseEuroToCents("1.234,56")).toBe(123456);
    expect(parseEuroToCents("1234.56")).toBe(123456);
    expect(parseEuroToCents("19,99 €")).toBe(1999);
  });

  it("parseQuantityToMilli akzeptiert beide Dezimalformate", () => {
    expect(parseQuantityToMilli("2,5")).toBe(2500);
    expect(parseQuantityToMilli("2.5")).toBe(2500); // Dezimalpunkt darf nicht als Tausender gelesen werden
    expect(parseQuantityToMilli("1")).toBe(1000);
    expect(parseQuantityToMilli("1.234,5")).toBe(1234500);
  });

  it("formatCents als de-DE/EUR", () => {
    expect(formatCents(123456)).toMatch(/1\.234,56/);
  });
});
