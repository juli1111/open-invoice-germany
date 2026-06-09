import { NextResponse } from "next/server";
import { z } from "zod";
import { recordPaymentSchema } from "@/schemas";
import { recordPayment, PaymentError } from "@/domain/invoice/payment";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const input = recordPaymentSchema.parse(await req.json());
    const inv = await recordPayment(id, input);
    return NextResponse.json({ status: inv.status, paidAmountCents: inv.paidAmountCents });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Validierung fehlgeschlagen", issues: e.issues }, { status: 400 });
    }
    const status = e instanceof PaymentError ? 422 : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
