import { prisma } from "@/lib/db";
import { buildDocEInvoiceData } from "@/domain/document/pdf-data";
import { renderInvoicePdf } from "@/lib/pdf/invoice-pdf";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const q = await prisma.quote.findUnique({
    where: { id },
    include: { lines: { orderBy: { position: "asc" } }, org: true, customer: true },
  });
  if (!q) return new Response("Dokument nicht gefunden", { status: 404 });

  const pdf = await renderInvoicePdf(buildDocEInvoiceData(q));
  const safe = (q.number ?? "dokument").replace(/[^A-Za-z0-9._-]/g, "_");
  return new Response(new Uint8Array(pdf), {
    headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${safe}.pdf"` },
  });
}
