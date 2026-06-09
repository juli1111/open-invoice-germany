import { NextResponse } from "next/server";
import { cancelInvoice, CancelError } from "@/domain/invoice/cancel";

export const runtime = "nodejs";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const result = await cancelInvoice(id);
    return NextResponse.json({
      originalNumber: result.originalNumber,
      creditNoteId: result.creditNote.id,
      creditNoteNumber: result.creditNote.number,
    });
  } catch (e) {
    const status = e instanceof CancelError ? 422 : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
