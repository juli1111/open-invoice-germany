"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ConvertButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function convert() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/documents/${documentId}/convert`, { method: "POST" });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? "Umwandeln fehlgeschlagen.");
      setBusy(false);
      return;
    }
    const j = (await res.json()) as { invoiceId: string };
    router.push(`/rechnungen/${j.invoiceId}`);
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        onClick={convert}
        disabled={busy}
        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {busy ? "…" : "In Rechnung umwandeln"}
      </button>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </span>
  );
}
