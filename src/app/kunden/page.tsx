import Link from "next/link";
import { prisma } from "@/lib/db";
import { archiveCustomer } from "@/app/actions/masterdata";

export const dynamic = "force-dynamic";

export default async function KundenPage() {
  const customers = await prisma.customer.findMany({
    where: { isArchived: false },
    orderBy: { name: "asc" },
    select: { id: true, name: true, city: true, type: true, vatId: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Kunden</h1>
        <Link href="/kunden/neu" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          Neuer Kunde
        </Link>
      </div>

      {customers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          Noch keine Kunden. Lege deinen ersten Kunden an.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Ort</th>
                <th className="px-4 py-3">Typ</th>
                <th className="px-4 py-3">USt-IdNr.</th>
                <th className="px-4 py-3 text-right">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/kunden/${c.id}`} className="font-medium text-indigo-600 hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.city}</td>
                  <td className="px-4 py-3 text-slate-600">{c.type === "BUSINESS" ? "B2B" : "B2C"}</td>
                  <td className="px-4 py-3 text-slate-500">{c.vatId ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <form action={archiveCustomer} className="inline">
                      <input type="hidden" name="id" value={c.id} />
                      <button className="text-xs text-slate-400 hover:text-rose-600">Archivieren</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
