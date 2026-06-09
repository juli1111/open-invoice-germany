import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CustomerForm } from "@/components/forms/CustomerForm";

export const dynamic = "force-dynamic";

export default async function KundeBearbeitenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/kunden" className="text-sm text-slate-500 hover:text-slate-800">
          ← Kunden
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Kunde bearbeiten</h1>
      </div>
      <CustomerForm customer={customer} />
    </div>
  );
}
