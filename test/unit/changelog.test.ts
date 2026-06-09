import { describe, it, expect } from "vitest";
import { computeEntryHash, verifyChain, canonicalize, type ChainEntry, type ChangeLogPayload } from "@/domain/changelog";

function buildChain(payloads: ChangeLogPayload[]): ChainEntry[] {
  let prev = "";
  const entries: ChainEntry[] = [];
  for (const payload of payloads) {
    const hash = computeEntryHash(prev, payload);
    entries.push({ prevHash: prev, hash, payload });
    prev = hash;
  }
  return entries;
}

const payloads: ChangeLogPayload[] = [
  { entity: "INVOICE", entityId: "a", action: "CREATE", actor: "system", at: "2026-06-09T00:00:00.000Z", diff: { x: 1 } },
  { entity: "INVOICE", entityId: "a", action: "FINALIZE", actor: "system", at: "2026-06-09T00:00:01.000Z", diff: { number: "RE-2026-0001" } },
];

describe("changelog hash-chain", () => {
  it("kanonisiert schlüssel-stabil", () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe(canonicalize({ a: 2, b: 1 }));
  });

  it("verifiziert eine intakte Kette", () => {
    expect(verifyChain(buildChain(payloads)).valid).toBe(true);
  });

  it("erkennt Manipulation eines Eintrags", () => {
    const entries = buildChain(payloads);
    entries[0] = { ...entries[0], payload: { ...entries[0].payload, diff: { x: 999 } } };
    const res = verifyChain(entries);
    expect(res.valid).toBe(false);
    expect(res.brokenIndex).toBe(0);
  });

  it("erkennt ein entferntes Glied (prevHash-Bruch)", () => {
    const entries = buildChain(payloads);
    expect(verifyChain([entries[1]]).valid).toBe(false);
  });
});
