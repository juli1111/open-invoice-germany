# Bekannte Einschränkungen (MVP)

Damit niemand böse Überraschungen erlebt: Das hier ist (noch) **nicht** abgedeckt oder nur eingeschränkt. Status: 2026-06-09.

## Betrieb & Sicherheit
- **Keine eingebaute Anmeldung.** Das MVP hat keine Authentifizierung. Betreibe es lokal (Solo) oder hinter einem Auth-Proxy — **nicht ungeschützt im Internet**. Die Invoice-Endpunkte (`/api/invoices/[id]/…`) sind nicht mandanten-/auth-geschützt.
- **Single-Tenant.** Das Datenmodell trägt `orgId`, die App nutzt aber eine aktive Organisation. Schreibpfade (Stammdaten) sind org-gescoped; eine vollständige Mehrmandanten-Trennung (inkl. Lese-Pfade, Postgres-RLS) ist Roadmap.

## E-Rechnung
- **Nur XRechnung-XML + PDF.** ZUGFeRD/Factur-X (PDF/A-3 mit eingebettetem XML) ist über den optionalen Mustang-Sidecar vorgesehen, aber noch nicht verdrahtet.
- **Validierung:** Lokal werden die EN-16931-**Kernregeln** geprüft (Pflichtfelder + Rechenregeln). Die **vollständige, autoritative** Prüfung (XSD + Schematron) macht der offizielle **KoSIT-Validator im CI** — lokal „valide" bedeutet nicht automatisch „KoSIT-bestanden".
- **Storno/Gutschrift als E-Rechnung:** wird als korrektes UBL-`CreditNote`-Dokument (Typ 381, positive Beträge) mit `BillingReference` (BG-3, Bezug zur Originalrechnung, § 31 Abs. 5 UStDV) erzeugt. ✓
- **EndpointID** wird als E-Mail (`EM`) ausgegeben. Leitweg-/Peppol-Schemacodes (EAS) werden noch nicht differenziert.
- **PaymentMeans** wird nur bei hinterlegter IBAN ausgegeben.
- **Positions-Rabatte** (AllowanceCharge BG-27/28) und strukturierte Skonto-Angaben (BT-20) sind noch nicht modelliert.

## Daten & Recht
- **PostgreSQL** nutzt im Docker-Setup vorerst `prisma db push` (eigene Postgres-Migrationen sind Roadmap). Solo/SQLite nutzt echte Migrationen.
- **Nummernkreise** sind standardmäßig jahresbasiert; eine UI zum Vorkonfigurieren (Präfix/Muster/jahresunabhängig) fehlt noch.
- **Feld-Validierung** von IBAN/BIC/USt-IdNr. ist bewusst locker (keine Prüfziffer/Mod-97). Offensichtlich falsche Werte können durchrutschen.
- **GoBD:** Die Software ermöglicht Unveränderbarkeit + Audit-Chain, ersetzt aber **nicht** die anwenderseitige **Verfahrensdokumentation**.

## Funktionsumfang (geplant)
Mahnwesen-UI, wiederkehrende Rechnungen/Abos, DATEV-/CSV-Export, OSS/ZM, USt-Voranmeldungs-Auswertung, VIES-Prüfung, Mehrbenutzer/Auth.

---

Etwas davon blockiert dich? → [Issue eröffnen](https://github.com/juli1111/open-invoice-germany/issues). Rechtliche Grundlagen: [COMPLIANCE.md](../COMPLIANCE.md).
