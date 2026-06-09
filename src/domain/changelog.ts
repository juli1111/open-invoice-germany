/**
 * Append-only Änderungsprotokoll mit Hash-Chain (GoBD-Unveränderbarkeit).
 *
 * Jeder Eintrag hasht (prevHash + kanonischer Eintragsinhalt). Eine nachträgliche
 * Manipulation eines Eintrags bricht die Kette ab dem manipulierten Glied — das
 * macht Veränderungen *erkennbar* (GoBD Rz 107 ff., § 146 Abs. 4 AO).
 */
import { createHash } from "node:crypto";

export interface ChangeLogPayload {
  entity: string;
  entityId: string;
  action: string; // CREATE | UPDATE | FINALIZE | CANCEL | DELETE_PRE_FINALIZE
  actor: string;
  at: string; // ISO-Zeitstempel (deterministisch übergeben)
  diff: unknown;
}

/** Stabiles, schlüssel-sortiertes JSON für reproduzierbare Hashes. */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`);
  return `{${entries.join(",")}}`;
}

export function computeEntryHash(prevHash: string, payload: ChangeLogPayload): string {
  return createHash("sha256")
    .update(`${prevHash}\n${canonicalize(payload)}`)
    .digest("hex");
}

export interface ChainEntry {
  prevHash: string;
  hash: string;
  payload: ChangeLogPayload;
}

/** Prüft eine geordnete Kette. Liefert den Index des ersten Bruchs (oder null). */
export function verifyChain(entries: readonly ChainEntry[]): {
  valid: boolean;
  brokenIndex: number | null;
} {
  let prev = "";
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.prevHash !== prev) return { valid: false, brokenIndex: i };
    if (computeEntryHash(prev, entry.payload) !== entry.hash) {
      return { valid: false, brokenIndex: i };
    }
    prev = entry.hash;
  }
  return { valid: true, brokenIndex: null };
}
