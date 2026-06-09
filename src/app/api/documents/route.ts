import { NextResponse } from "next/server";
import { z } from "zod";
import { createDocumentSchema } from "@/schemas";
import { createBusinessDocument } from "@/domain/document/create";
import { getActiveOrg } from "@/lib/org";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const org = await getActiveOrg();
    const input = createDocumentSchema.parse(await req.json());
    const doc = await createBusinessDocument(org.id, input);
    return NextResponse.json({ id: doc.id, number: doc.number, kind: doc.kind }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Validierung fehlgeschlagen", issues: e.issues }, { status: 400 });
    }
    console.error("POST /api/documents:", e);
    return NextResponse.json({ error: "Dokument konnte nicht angelegt werden. Bitte Eingaben prüfen." }, { status: 400 });
  }
}
