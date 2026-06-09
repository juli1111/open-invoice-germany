"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PaymentForm({ invoiceId, openCents }: { invoiceId: string; openCents: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState((openCents / 100).toFixed(2));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const cents = Math.round((parseFloat(amount.replace(",", ".")) || 0) * 100);
    const res = await fetch(`/api/invoices/${invoiceId}/payment`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amountCents: cents, method: "TRANSFER" }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? "Fehler");
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Zahlung erfassen (€)</span>
        <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>
      <button type="submit" disabled={busy} className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
        {busy ? "…" : "Buchen"}
      </button>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </form>
  );
}
