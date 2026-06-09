# ARCHITEKTUR-Vorschlag: Open-Source-Rechnungssoftware DE

> Begleitdokument zu `COMPLIANCE.md`. Stand: 2026-06-09. Entscheidungsvorschlag zur Freigabe — noch nicht implementiert.

Stack (fix): Next.js 14 App Router · TS strict · Prisma · PostgreSQL (Docker) / SQLite-Solo · Tailwind · Zod an jedem Boundary · React Hook Form. Rechtlicher Rahmen: §14/§14a/§19/§14b UStG, §§33/34/34a UStDV, GoBD (§146 AO, §239 HGB), DSGVO.

---

## 1. Domänen-Datenmodell

### Entitäten + Schlüsselfelder

**Organization (Mandant/Unternehmen)** — der ausstellende Unternehmer
`id` · `legalName` · `address` (struct) · `taxNumber?` · `vatId?` (USt-IdNr.) · `kuIdNr?` (§19a) · `smallBusiness` (bool, §19) · `defaultTaxScheme` (REGULAR | KLEINUNTERNEHMER | DIFFERENZ) · `iban` · `bic` · `bankName` · `electronicAddress?` (Peppol) · `createdAt`
→ Tenancy-Diskriminator auf **allen** belegführenden Tabellen (`orgId`), App-seitig erzwungen; bei Multi-Tenant zusätzlich Postgres RLS.

**Customer (Kunde)**
`id` · `orgId` · `type` (BUSINESS | CONSUMER) — steuert §286-Verzugslogik, 40-€-Pauschale, B2B-E-Rechnungspflicht · `name` · `address` · `vatId?` · `vatIdValidatedAt?` (VIES/§18e) · `countryCode` · `leitwegId?` (B2G, BT-10) · `peppolId?` · `defaultPaymentTermsDays` (Default 14) · `isArchived` (Soft-Delete, **kein** Hard-Delete bei Belegbezug)

**Product (Produkt/Leistung)** — Katalog, frei editierbar (kein Beleg)
`id` · `orgId` · `name` · `description` · `unit` (EN-16931 UN/ECE Rec 20, z.B. `C62`, `HUR`) · `netPrice` (Decimal) · `taxRate` (enum 19/7/0) · `taxCategory` (S | AE | K | G | E | Z — EN-16931 UNTDID 5305) · `differential` (bool, §25a)

**NumberRange (Nummernkreis)** — eigene Tabelle, transaktionaler Zähler
`id` · `orgId` · `docType` (QUOTE | INVOICE | CREDIT_NOTE | DUNNING) · `prefix` · `pattern` (z.B. `RE-{YYYY}-{SEQ:5}`) · `year?` (für jahresbasierte Kreise) · `currentValue` (Int) · `@@unique([orgId, docType, year])`

**Quote (Angebot)** — kein Beleg i.S.d. GoBD, frei editier-/löschbar
`id` · `orgId` · `customerId` · `number` · `status` (DRAFT | SENT | ACCEPTED | DECLINED | EXPIRED) · `validUntil` · `lines[]` · Summenfelder · `convertedToInvoiceId?`

**Invoice (Rechnung)** — der GoBD-relevante Beleg
`id` · `orgId` · `customerId` · `number?` (NULL bis Festschreibung) · **`status`** (DRAFT | FINALIZED | SENT | PAID | PARTIALLY_PAID | CANCELLED) · `type` (INVOICE | CREDIT_NOTE | CORRECTION) · `taxScheme` · `issueDate` · `deliveryDate`/`deliveryPeriod` (§14 Abs.4 Nr.6) · `dueDate` · `currency` · `lines[]` · `netTotal` · `taxBreakdown` (JSON: pro Satz Netto/Steuer) · `grossTotal` · `paidAmount` · `notes` (Skonto-Freitext §14.5(19), Reverse-Charge-/§25a-Hinweis) · `consumerRetentionHint` (bool, §14b Abs.1 S.5) · `reversedByInvoiceId?` / `correctsInvoiceId?` · `xmlFormat?` (XRECHNUNG | ZUGFERD) · `xmlHash?` · `pdfPath?` · `finalizedAt?` · `createdAt`

**InvoiceLine (Rechnungsposition)**
`id` · `invoiceId` · `position` · `productId?` (Snapshot — kein Live-Lookup) · `description` · `quantity` · `unit` · `unitNetPrice` · `taxRate` · `taxCategory` · `discount?` · `lineNetTotal`
→ Alle steuer-/preisrelevanten Werte werden bei Festschreibung **eingefroren** (Snapshot), nie per Relation auf den Live-Katalog aufgelöst.

**Payment (Zahlung)**
`id` · `invoiceId` · `amount` · `paidAt` · `method` (TRANSFER | CASH | CARD | SEPA) · `reference` · `isSkonto` (bool — §17-Fall, **keine** Rechnungsberichtigung nötig) · `createdAt`

**Dunning (Mahnung)**
`id` · `invoiceId` · `level` (REMINDER=0 | DUNNING_1 | DUNNING_2) · `sentAt` · `dueDate` · `baseInterestRate` (Snapshot Basiszins zum Verzugsstichtag) · `interestRate` (5 oder 9 Pp, abhängig `Customer.type`) · `interestAmount` · `lateFee?` (nur konkrete Porto-/Materialkosten, **nicht** Pauschale) · `flatFee40?` (nur `type=BUSINESS`, §288 Abs.5) · `pdfPath?`
→ Verzugslogik: Level-0-Erinnerung kostenfrei (verzugsbegründend, h.M. nicht ersatzfähig); ab Level-1 Verzugsschaden.

**ChangeLog (append-only Änderungsprotokoll)** — GoBD-Kern
`id` · `orgId` · `entity` (INVOICE | PAYMENT | …) · `entityId` · `action` (CREATE | UPDATE | FINALIZE | CANCEL | DELETE_PRE_FINALIZE) · `actorId` · `at` · `diff` (JSON: alte→neue Werte) · `prevHash` · `hash`
→ Append-only: **kein** UPDATE/DELETE-Recht (DB-User ohne diese Grants + App-Layer), Hash-Chain (`hash = sha256(prevHash + canonical(diff))`) macht Manipulation erkennbar.

**EmailLog** — Versandprotokoll (Resend o.ä.)
`id` · `orgId` · `invoiceId?`/`dunningId?` · `template` · `to` · `status` (QUEUED | SENT | DELIVERED | BOUNCED) · `providerId` · `sentAt` · `error?`

### GoBD-Unveränderbarkeit + lückenloser Nummernkreis — technisch erzwungen

**Status-Maschine `draft → finalized`:**
- **DRAFT**: voll editierbar/löschbar, `number = NULL`, keine ChangeLog-FINALIZE-Pflicht, kein XML/PDF. Hier passiert das gesamte Erfassen/Korrigieren.
- **Übergang `finalize()` in EINER `prisma.$transaction`** (Serializable):
  1. `SELECT ... FOR UPDATE` auf `NumberRange` → `currentValue++` → Nummer atomar vergeben (verhindert Doppelvergabe bei Nebenläufigkeit; `@@unique` als zweite Verteidigungslinie).
  2. `Invoice.status = FINALIZED`, `number` setzen, `finalizedAt = now()`, Zeilen-Snapshots fixieren.
  3. XML (XRechnung/ZUGFeRD) + PDF erzeugen, `xmlHash` speichern.
  4. `ChangeLog`-FINALIZE-Eintrag (Hash-Chain) schreiben.
  - Schlägt ein Schritt fehl → Rollback, **Nummer bleibt unverbraucht** (Zähler nur in derselben Tx erhöht).
- **FINALIZED ist append-only**: Prisma-Middleware (`$extends`/`$use`) blockt jedes `update`/`delete` auf `Invoice`/`InvoiceLine` mit `status != DRAFT`. Erlaubt sind nur: `status`-Übergänge SENT/PAID, `paidAmount`, sowie der Sondereintrag CANCEL.

**Keine Hard-Deletes nach Festschreibung / Storno statt Löschung:**
- `delete` auf FINALIZED → Middleware wirft Fehler. Korrektur ausschließlich über:
  - **Storno** = neue Invoice `type=CREDIT_NOTE`, `reversedByInvoiceId`-Verknüpfung, eigene Nummer aus dem Kreis, betragsspiegelbildlich. Original bleibt unverändert bestehen.
  - **Korrekturrechnung** (`type=CORRECTION`, `correctsInvoiceId`, §31 Abs.5 UStDV: eindeutiger Bezug auf Original-Nr.+Datum).
- DSGVO-Konflikt (Art. 17 vs. §147 AO): rechnungsbezogene Kunden werden bei Löschverlangen **archiviert/gesperrt** (`isArchived`, Art. 18), nicht hart gelöscht, bis Aufbewahrungsfrist (8 J., §14b Abs.1) abläuft. Hard-Delete nur für Quotes/Drafts ohne Belegbezug.

**Lückenloser Nummernkreis (gesetzeskonform „einmalig", nicht zwingend lückenlos):**
- Vergabe **nur** beim Festschreiben, transaktional, monoton steigend pro `(orgId, docType, year)`. Drafts haben keine Nummer → kein „Loch" durch verworfene Entwürfe.
- Stornos verbrauchen reguläre Nummern aus dem Kreis → entstehende „Sprünge" sind systemdokumentiert (ChangeLog), damit bei BP erklärbar (UStAE 14.5(10): Einmaligkeit zwingend, Lückenlosigkeit nicht; unerklärte Lücken = Schätzungsrisiko).

---

## 2. E-Rechnung: Erzeugung & Validierung

### Anforderung
EN-16931-konform: **XRechnung** (UBL oder CII, reines XML) und **ZUGFeRD/Factur-X** (PDF/A-3 mit eingebettetem CII-XML, Profil ≥ EN16931/COMFORT — **niemals** MINIMUM/BASIC-WL, gelten nicht als E-Rechnung). Bei Hybrid ist der XML-Teil führend (BMF 15.10.2025) → 14c-Risiko bei Divergenz, daher PDF deterministisch aus denselben Daten rendern.

### Optionen bewertet

| Schicht | Optionen | Bewertung |
|---|---|---|
| **XML-Erzeugung** | (a) eigene Templates · (b) JS-Lib (`node-zugferd`, WIP v0.1) · (c) **Mustangproject** (Java, Apache-2.0) | Eigene Templates = Wartungslast bei jeder EN-16931/XRechnung-Versionsdrift, fehleranfällig → **nein**. node-zugferd zu unreif für Rechtssicherheit. Mustang reif, erzeugt+embedded+validiert. |
| **PDF/A-3-Embedding** | reine Node-PDF-Libs · Mustang/horstoeko | Node-Ökosystem für korrektes PDF/A-3 (XMP, ICC, AFRelationship) **dünn** → hohes Risiko formal ungültiger Container. |
| **Validierung CI/Test** | **KoSIT-Validator** (Java, offizielle Referenz) + `validator-configuration-xrechnung` · **veraPDF** (PDF/A-3) | De-facto-Standard. Zwei Ebenen: KoSIT = XML/Schematron, veraPDF = PDF/A-Container. Reine JS-Validierung deckt EN-16931-Schematron **nicht** vollständig ab. |

### KLARE EMPFEHLUNG

**JVM-Sidecar-Pattern: Mustangproject als HTTP-Microservice (Docker), aus Next.js per `fetch` angesprochen.**

Begründung:
1. **Ein Tool deckt Erzeugung + PDF/A-3-Embedding + Validierung (inkl. integriertem veraPDF)** ab — minimiert Format-Drift-Risiko und vermeidet das dünne Node-PDF/A-Ökosystem.
2. **Rechtssicherheit**: Mustang folgt offiziell den ZUGFeRD/XRechnung-Versionen; in CI zusätzlich **KoSIT-Validator** als unabhängige Zweitprüfung (jede generierte Rechnung im Test gegen KoSIT-Config validieren).
3. **Saubere Trennung**: Next.js bleibt der Datenproduzent (validiertes EN-16931-DTO via Zod), der Sidecar ist reine Render-/Validier-Engine — austauschbar, ohne JVM-Wissen im App-Code.
4. **Solo-/SQLite-Modus**: Sidecar bleibt optionaler Container; ohne ihn kann die App „sonstige Rechnung" (PDF) ausstellen (für B2C / §33 / §19 zulässig), E-Rechnung wird erst beim Sidecar-Start scharfgeschaltet.

**CI-Gate (verpflichtend):** jeder generierte Beleg im Test → KoSIT-Validator + veraPDF; Build rot bei FAIL. Validator-Config + ZUGFeRD-Version als gepinnte Artefakte, Renovate-Update überwacht Drift.

---

## 3. Lizenz-Empfehlung

Ziel: (a) niemand zahlt mehr für Rechnungssoftware, (b) keine proprietäre Closed-Source-SaaS-Abzweigung, (c) maximale Community-Beiträge.

### EMPFEHLUNG: **AGPL-3.0**

Begründung:
- **MIT/Apache-2.0** erlauben jedem, den Code zu nehmen, als gehostete SaaS zu schließen und nichts zurückzugeben — das verletzt Ziel (b) direkt. Apache bringt zwar expliziten Patent-Grant (gut), schützt aber nicht gegen Closed-SaaS.
- **AGPL-3.0** schließt die „SaaS-Lücke" der GPL: Wer den Code als Netzwerk-Dienst betreibt, muss den (modifizierten) Quellcode den Nutzern verfügbar machen. Genau der Hebel gegen die proprietäre Closed-Source-SaaS.
- Für ein **Self-Hosting-First**-Tool ist AGPL natürlich: der typische Nutzer hostet selbst und ist durch die Copyleft-Pflicht ohnehin nicht belastet; nur der Trittbrettfahrer, der zumacht, wird getroffen.
- Community-Beiträge: starkes Copyleft + glaubwürdige „bleibt-frei"-Garantie zieht beitragswillige Entwickler an, die nicht wollen, dass ihre Arbeit in einem geschlossenen Produkt verschwindet.

**Gegenrede:** AGPL schreckt Unternehmens-Integratoren ab (viele Corporate-Policies verbieten AGPL-Abhängigkeiten), was die Adoption und damit indirekt den Beitragsstrom dämpfen kann. Außerdem ist die „Netzwerk-Nutzung löst Offenlegung aus"-Pflicht in der Praxis schwer durchzusetzen. **Mitigation:** CLA/DCO einsammeln, um eine spätere Lizenz-Nachjustierung oder ein optionales kommerzielles Dual-Licensing offenzuhalten — falls breitere kommerzielle Einbettung gewünscht wird, ohne das Closed-SaaS-Schutzziel aufzugeben.

---

## 4. Ordner-/Modulstruktur

```
src/
  app/
    (app)/
      rechnungen/        # Invoice-CRUD, Festschreiben, Storno
      angebote/
      kunden/
      produkte/
      mahnwesen/
      einstellungen/     # Org, Nummernkreise, Steuer-Schema
    api/
      invoices/          # finalize/cancel/erechnung-Endpoints
      einvoice/          # Sidecar-Proxy (Mustang)
      validate-vatid/    # §18e/VIES
  domain/                # framework-frei, testbar
    invoice/
      finalize.ts        # transaktionale Festschreibung + Nummernvergabe
      cancel.ts          # Storno-/Korrektur-Logik
      tax-calc.ts        # §14/§25a/RC, Brutto/Netto, taxBreakdown
    dunning/
      verzug.ts          # §286/§288, Basiszins-Tabelle, 40€-Pauschale
    numbering/
      allocate.ts
    audit/
      changelog.ts       # Hash-Chain
  schemas/               # Zod — DTOs, EN-16931-Mapping, API-Boundaries
  lib/
    db.ts                # Prisma + append-only-/no-finalized-edit-Middleware
    einvoice-client.ts   # fetch → Mustang-Sidecar
    money.ts             # Decimal-Arithmetik
  emails/                # React-Email Templates
prisma/
  schema.prisma
  migrations/
einvoice-service/        # Dockerfile: Mustang HTTP-Sidecar (Java)
test/
  einvoice/              # KoSIT + veraPDF Fixtures (CI-Gate)
  domain/                # Festschreibung, Nummernkreis, Storno, Verzug
docker-compose.yml       # postgres + einvoice-service (+ optional resend-mock)
```

---

## 5. MVP-Schnitt vs. Ausbaustufen

### MVP (zuerst — deckt den B2C/Solo-/§19-Fall vollständig)
- **Org-Setup**, Kunden, Produkte, Angebot → Rechnung.
- **Festschreibung + Nummernkreise + ChangeLog (Hash-Chain) + Storno** — der nicht verhandelbare GoBD-Kern.
- **Standard-Rechnung Regelbesteuerung 19/7/0** + **Kleinunternehmer §19** (Pflichthinweis §34a, kein USt-Ausweis) + **§33 Kleinbetrag**.
- **PDF (PDF/A-3-fähig) + ZUGFeRD-Export** via Sidecar; einfaches PDF („sonstige Rechnung") für B2C/§19 ohne Sidecar.
- Zahlungserfassung, Mahn-Basis (Erinnerung + Verzugszins B2C 5 Pp).
- SQLite-Solo-Modus lauffähig ohne Docker/Sidecar.

### Stufe 2 (E-Rechnung B2B scharf)
- **XRechnung** (UBL+CII) + **ZUGFeRD EN16931/EXTENDED**, KoSIT/veraPDF-CI-Gate produktiv.
- B2B-Verzugslogik: **9 Pp + 40-€-Pauschale (§288 Abs.5)**, halbjahresgenaue Basiszins-Tabelle.
- **VIES/§18e**-Validierung, **Reverse Charge §13b** (Pflichthinweis, kein USt-Ausweis), ig. Lieferung §6a + Hinweise §14a.
- Korrekturrechnung §31 Abs.5 als E-Rechnung (PDF-Korrektur einer E-Rechnung unzulässig).

### Stufe 3 (Spezialfälle + Komfort)
- **Differenzbesteuerung §25a** (Refurb/Gebrauchtwaren, Marker „Gebrauchtgegenstände/Sonderregelung", Margenlogik, Gesamtdifferenz ≤750 €).
- **B2G**: Leitweg-ID (BT-10), Peppol-Versand, OZG-RE.
- **ZM §18a**, **OSS §18j** (EU-B2C-Fernverkauf).
- Mehrstufiges automatisiertes Mahnwesen, wiederkehrende Rechnungen/Abos, DATEV-Export, Multi-Tenant-RLS, revisionssichere Langzeit-Archivierung (8 J., §14b).
