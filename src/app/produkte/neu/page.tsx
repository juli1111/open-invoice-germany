import Link from "next/link";
import { dbInternal } from "@/lib/db";
import { ProductForm } from "@/components/forms/ProductForm";
import { NeedOrgNotice } from "@/components/NeedOrgNotice";

export const dynamic = "force-dynamic";

export default async function NeuesProduktPage() {
  const org = await dbInternal.organization.findFirst({ select: { id: true } });
  if (!org) return <NeedOrgNotice />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/produkte" className="text-sm text-slate-500 hover:text-slate-800">
          ← Produkte
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Neues Produkt</h1>
      </div>
      <ProductForm />
    </div>
  );
}
