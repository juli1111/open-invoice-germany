/**
 * Verzugszins-Berechnung nach § 288 BGB (rein, testbar).
 *
 * Verzugszins = (Basiszinssatz + Zuschlag) p.a. auf den offenen Betrag, taggenau.
 * Zuschlag: 5 Prozentpunkte ggü. Verbraucher (B2C), 9 Pp im B2B (§ 288 Abs. 1/2).
 * 40-€-Pauschale (§ 288 Abs. 5) nur B2B, einmal je Forderung (EuGH C-419/21).
 * Quellen: COMPLIANCE.md Abschnitt 12.
 */
import { roundHalfUp } from "./money";

/** Basiszinssatz in Basispunkten (1 % = 100 bp). 1,27 % zum 01.01.2026 (Bundesbank).
 *  Bewegliches Ziel — halbjährliche Anpassung (1.1./1.7.); per Override aktualisierbar. */
export const DEFAULT_BASE_RATE_BP = 127;

export interface DunningCalcInput {
  openAmountCents: number;
  daysOverdue: number;
  isConsumer: boolean;
  baseRateBp?: number;
  applyFlatFee: boolean;
}

export interface DunningCalcResult {
  pointsBp: number;
  baseRateBp: number;
  interestCents: number;
  flatFee40Cents: number;
  totalCents: number;
}

export function computeDunning(input: DunningCalcInput): DunningCalcResult {
  const baseRateBp = input.baseRateBp ?? DEFAULT_BASE_RATE_BP;
  const pointsBp = (input.isConsumer ? 5 : 9) * 100;
  const totalRateBp = baseRateBp + pointsBp;
  const days = Math.max(0, input.daysOverdue);
  const interestCents = roundHalfUp((input.openAmountCents * totalRateBp * days) / (10000 * 365));
  const flatFee40Cents = input.applyFlatFee && !input.isConsumer ? 4000 : 0;
  return {
    pointsBp,
    baseRateBp,
    interestCents,
    flatFee40Cents,
    totalCents: input.openAmountCents + interestCents + flatFee40Cents,
  };
}

export function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export const DUNNING_LEVEL_TITLE: Record<number, string> = {
  0: "Zahlungserinnerung",
  1: "1. Mahnung",
  2: "2. Mahnung",
  3: "3. Mahnung",
};
