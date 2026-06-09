import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  INVOICE: "Rechnung",
  CREDIT_NOTE: "Gutschrift",
  CORRECTION: "Korrektur",
};

export default async function RechnungenPage() {
  const invoices = await prisma.invoice.findMany({
    include: { customer: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Rechnungen</h1>
        <Link href="/rechnungen/neu" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          Neue Rechnung
        </Link>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          Noch keine Rechnungen.{" "}
          <Link href="/rechnungen/neu" className="font-medium text-indigo-600 hover:underline">
            Lege deine erste Rechnung an.
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Nummer</th>
                <th className="px-4 py-3">Typ</th>
                <th className="px-4 py-3">Kunde</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Brutto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/rechnungen/${inv.id}`} className="font-medium text-indigo-600 hover:underline">
                      {inv.number ?? "Entwurf"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{TYPE_LABEL[inv.type] ?? inv.type}</td>
                  <td className="px-4 py-3 text-slate-600">{inv.customer.name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="tabular px-4 py-3 text-right font-medium">{formatCents(inv.grossTotalCents, inv.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
