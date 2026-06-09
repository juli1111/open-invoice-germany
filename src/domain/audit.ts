/**
 * Schreibt einen Eintrag ins append-only Änderungsprotokoll und verkettet ihn
 * per Hash mit dem vorherigen Eintrag derselben Organisation (GoBD).
 */
import type { Prisma } from "@/generated/prisma/client";
import { canonicalize, computeEntryHash, type ChangeLogPayload } from "@/domain/changelog";

export interface ChangeLogInput {
  orgId: string;
  entity: string;
  entityId: string;
  action: string;
  actor: string;
  at: Date;
  diff: unknown;
}

export async function appendChangeLog(tx: Prisma.TransactionClient, input: ChangeLogInput) {
  const prev = await tx.changeLog.findFirst({
    where: { orgId: input.orgId },
    orderBy: { id: "desc" }, // streng monotone Einfüge-Reihenfolge
    select: { hash: true },
  });

  const payload: ChangeLogPayload = {
    entity: input.entity,
    entityId: input.entityId,
    action: input.action,
    actor: input.actor,
    at: input.at.toISOString(),
    diff: input.diff,
  };
  const prevHash = prev?.hash ?? "";
  const hash = computeEntryHash(prevHash, payload);

  return tx.changeLog.create({
    data: {
      orgId: input.orgId,
      entity: input.entity,
      entityId: input.entityId,
      action: input.action,
      actor: input.actor,
      at: input.at,
      diffJson: canonicalize(input.diff),
      prevHash,
      hash,
    },
  });
}
