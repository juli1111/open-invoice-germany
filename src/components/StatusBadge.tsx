const MAP: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Entwurf", cls: "bg-slate-100 text-slate-700" },
  FINALIZED: { label: "Festgeschrieben", cls: "bg-indigo-100 text-indigo-800" },
  SENT: { label: "Versendet", cls: "bg-sky-100 text-sky-800" },
  PARTIALLY_PAID: { label: "Teilbezahlt", cls: "bg-amber-100 text-amber-800" },
  PAID: { label: "Bezahlt", cls: "bg-emerald-100 text-emerald-800" },
  CANCELLED: { label: "Storniert", cls: "bg-rose-100 text-rose-700" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = MAP[status] ?? { label: status, cls: "bg-slate-100 text-slate-700" };
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}
