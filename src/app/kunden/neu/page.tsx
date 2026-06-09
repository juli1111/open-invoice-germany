import Link from "next/link";
import { dbInternal } from "@/lib/db";
import { CustomerForm } from "@/components/forms/CustomerForm";
import { NeedOrgNotice } from "@/components/NeedOrgNotice";

export const dynamic = "force-dynamic";

export default async function NeuerKundePage() {
  const org = await dbInternal.organization.findFirst({ select: { id: true } });
  if (!org) return <NeedOrgNotice />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/kunden" className="text-sm text-slate-500 hover:text-slate-800">
          ← Kunden
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Neuer Kunde</h1>
      </div>
      <CustomerForm />
    </div>
  );
}
