import { dbInternal } from "@/lib/db";

/**
 * MVP: Single-Tenant. Liefert die (erste) eingerichtete Organisation.
 * Multi-Tenant-Auflösung (Session/RLS) ist für eine spätere Stufe vorgesehen.
 */
export async function getActiveOrg() {
  const org = await dbInternal.organization.findFirst({ orderBy: { createdAt: "asc" } });
  if (!org) {
    throw new Error("Kein Unternehmen eingerichtet. Bitte zuerst unter Einstellungen die Stammdaten anlegen.");
  }
  return org;
}
