import Link from "next/link";

const FEATURES = [
  {
    title: "E-Rechnung-Pflicht 2025–2028",
    body: "XRechnung (UBL/CII) & ZUGFeRD/Factur-X nach EN 16931 — empfangen heute, versenden ab 2027/2028. PDF allein zählt nicht mehr.",
  },
  {
    title: "GoBD-konform",
    body: "Festschreibung statt Bearbeiten, lückenlose Nummernkreise, append-only Audit-Hash-Chain. Festgeschriebene Belege sind unveränderbar.",
  },
  {
    title: "Alle Rechnungstypen",
    body: "Standard, Kleinbetrag (§ 33), Kleinunternehmer (§ 19), Reverse Charge (§ 13b), ig. Lieferung, Differenzbesteuerung (§ 25a).",
  },
  {
    title: "Self-hosted & DSGVO",
    body: "Läuft komplett bei dir — SQLite-Solo ohne Server oder PostgreSQL via Docker. Keine Cloud-Pflicht, keine Vendor-Locks.",
  },
];

export default function Home() {
  return (
    <div className="space-y-16">
      <section className="space-y-6">
        <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
          Open Source · AGPL-3.0 · kostenlos
        </span>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
          Rechtssichere Rechnungen für Deutschland —{" "}
          <span className="text-indigo-600">für immer kostenlos.</span>
        </h1>
        <p className="max-w-2xl text-lg text-slate-600">
          OpenInvoice Germany ist eine freie, self-hostbare Rechnungssoftware mit E-Rechnung, GoBD und allen
          umsatzsteuerlichen Pflichtangaben. Damit kein Selbstständiger und kein KMU mehr für rechtskonforme
          Rechnungen zahlen muss.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/rechnungen"
            className="rounded-md bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700"
          >
            Zu den Rechnungen
          </Link>
          <a
            href="https://github.com/juli1111/open-invoice-germany"
            className="rounded-md border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            Quellcode auf GitHub
          </a>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="font-semibold text-slate-900">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.body}</p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        <strong>Hinweis:</strong> Diese Software ist keine Steuer- oder Rechtsberatung. GoBD-Konformität erfordert
        zusätzlich eine Verfahrensdokumentation des Anwenders. Alle rechtlichen Grundlagen mit Quellen findest du in
        der Datei <code className="font-mono">COMPLIANCE.md</code>.
      </section>
    </div>
  );
}
