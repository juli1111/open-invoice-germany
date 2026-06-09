import Link from "next/link";
import { prisma } from "@/lib/db";
import { getActiveOrg } from "@/lib/org";
import { NewInvoiceForm } from "@/components/NewInvoiceForm";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  let orgId: string;
  try {
    const org = await getActiveOrg();
    orgId = org.id;
  } catch {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Kein Unternehmen eingerichtet. Bitte zuerst Stammdaten anlegen — z. B. mit{" "}
        <code className="font-mono">npm run db:seed</code>.
      </div>
    );
  }

  const [customers, products] = await Promise.all([
    prisma.customer.findMany({ where: { orgId, isArchived: false }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { orgId, isArchived: false },
      select: { id: true, name: true, unit: true, netPriceCents: true, taxRate: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (customers.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Noch keine Kunden angelegt. Lege zuerst einen Kunden an (oder führe <code className="font-mono">npm run db:seed</code> aus).
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/rechnungen" className="text-sm text-slate-500 hover:text-slate-800">
          ← Rechnungen
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Neue Rechnung</h1>
      </div>
      <NewInvoiceForm customers={customers} products={products} />
    </div>
  );
}
