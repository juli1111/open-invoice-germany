import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  ANGEBOT: "Angebot",
  AUFTRAGSBESTAETIGUNG: "Auftragsbestätigung",
  PROFORMA: "Proforma",
};

export default async function DokumentePage() {
  const docs = await prisma.quote.findMany({
    include: { customer: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dokumente</h1>
        <Link href="/dokumente/neu" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          Neues Dokument
        </Link>
      </div>
      <p className="text-sm text-slate-500">Angebote, Auftragsbestätigungen und Proforma-Rechnungen — keine Steuerbelege; jederzeit in eine Rechnung umwandelbar.</p>

      {docs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          Noch keine Dokumente.{" "}
          <Link href="/dokumente/neu" className="font-medium text-indigo-600 hover:underline">
            Lege dein erstes Angebot an.
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Nummer</th>
                <th className="px-4 py-3">Art</th>
                <th className="px-4 py-3">Kunde</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Brutto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docs.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/dokumente/${d.id}`} className="font-medium text-indigo-600 hover:underline">
                      {d.number ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{KIND_LABEL[d.kind] ?? d.kind}</td>
                  <td className="px-4 py-3 text-slate-600">{d.customer.name}</td>
                  <td className="px-4 py-3 text-slate-500">{d.status === "CONVERTED" ? "in Rechnung umgewandelt" : "offen"}</td>
                  <td className="tabular px-4 py-3 text-right font-medium">{formatCents(d.grossTotalCents, d.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
