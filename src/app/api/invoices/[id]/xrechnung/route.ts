import { prisma } from "@/lib/db";
import { buildEInvoiceData } from "@/lib/einvoice/mapper";
import { buildXRechnungUBL } from "@/lib/einvoice/xrechnung";
import { validateXRechnung } from "@/lib/einvoice/en16931-core";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { lines: { orderBy: { position: "asc" } }, org: true, customer: true },
  });
  if (!invoice) return new Response("Rechnung nicht gefunden", { status: 404 });
  if (invoice.status === "DRAFT")
    return new Response("Entwürfe können nicht als E-Rechnung exportiert werden. Bitte zuerst festschreiben.", { status: 422 });

  const data = buildEInvoiceData(invoice);
  const xml = buildXRechnungUBL(data);

  // Selbstkontrolle: Kernregeln vor Auslieferung prüfen (?validate=1 -> JSON-Report)
  const report = validateXRechnung(data, xml);
  const url = new URL(req.url);
  if (url.searchParams.get("validate") === "1") {
    return Response.json(report);
  }
  if (!report.valid) {
    return Response.json({ error: "EN-16931-Kernvalidierung fehlgeschlagen", issues: report.errors }, { status: 422 });
  }

  const safe = (invoice.number ?? "rechnung").replace(/[^A-Za-z0-9._-]/g, "_"); // Header-Injection vermeiden
  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "content-disposition": `attachment; filename="${safe}.xml"`,
    },
  });
}
