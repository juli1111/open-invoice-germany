import { NextResponse } from "next/server";
import { z } from "zod";
import { createInvoiceSchema } from "@/schemas";
import { createDraftInvoice } from "@/domain/invoice/create";
import { getActiveOrg } from "@/lib/org";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const org = await getActiveOrg();
    const body = await req.json();
    const input = createInvoiceSchema.parse(body);
    const invoice = await createDraftInvoice(org.id, input);
    return NextResponse.json({ id: invoice.id, status: invoice.status }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Validierung fehlgeschlagen", issues: e.issues }, { status: 400 });
    }
    console.error("POST /api/invoices:", e);
    return NextResponse.json({ error: "Rechnung konnte nicht angelegt werden. Bitte Eingaben prüfen." }, { status: 400 });
  }
}
