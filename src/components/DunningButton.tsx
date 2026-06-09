"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DunningButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function dun() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/invoices/${invoiceId}/dunning`, { method: "POST" });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? "Mahnen fehlgeschlagen.");
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button onClick={dun} disabled={busy} className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-60">
        {busy ? "…" : "Nächste Mahnstufe"}
      </button>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </span>
  );
}
