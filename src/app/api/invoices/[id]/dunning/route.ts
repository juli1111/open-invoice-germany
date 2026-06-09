import { NextResponse } from "next/server";
import { createDunning, DunningError } from "@/domain/dunning/create";

export const runtime = "nodejs";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const res = await createDunning(id);
    return NextResponse.json({ dunningId: res.dunning.id, number: res.dunning.number, level: res.level });
  } catch (e) {
    const status = e instanceof DunningError ? 422 : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
