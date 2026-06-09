import { prisma } from "@/lib/db";
import { buildEInvoiceData } from "@/lib/einvoice/mapper";
import { renderInvoicePdf } from "@/lib/pdf/invoice-pdf";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { lines: { orderBy: { position: "asc" } }, org: true, customer: true },
  });
  if (!invoice) return new Response("Rechnung nicht gefunden", { status: 404 });

  const pdf = await renderInvoicePdf(buildEInvoiceData(invoice));
  const name = invoice.number ?? `entwurf-${invoice.id.slice(0, 8)}`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${name}.pdf"`,
    },
  });
}
