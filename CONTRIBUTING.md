# Mitmachen bei OpenInvoice Germany

Danke, dass du beitragen willst! Ziel des Projekts: rechtssichere Rechnungsstellung für Deutschland **kostenlos und frei** halten.

## Entwicklungs-Setup

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

## Vor jedem Pull Request

```bash
npm run typecheck   # tsc --noEmit
npm run lint
npm test            # alle Tests müssen grün sein
npm run build       # Production-Build muss durchlaufen
```

## Konventionen

- **TypeScript strict**, kein `any` (nutze `unknown` + Narrowing).
- **Zod an jedem Boundary** (API-Routes, Formulare). DB-„Enums" sind Strings + Zod.
- **Geld als Integer-Cent**, **Mengen als Integer-Milliunits** — keine Floats für Beträge.
- **Prisma** immer mit `select`/`include` (kein N+1). Festgeschriebene Rechnungen niemals direkt mutieren — nur über die Domain-Services (`finalize`, `cancel`, `recordPayment`).
- Domain-Logik in `src/domain/` bleibt **rein und testbar**; alles mit DB-/Framework-Bezug klar getrennt.
- Dateien kebab-case, Komponenten PascalCase, Konstanten UPPER_SNAKE_CASE.

## Rechtliche Änderungen

Korrekturen an Pflichtangaben, Fristen, Steuerlogik etc. **immer mit Quelle** (Norm, BMF-Schreiben, KoSIT-Spezifikation) und als Update an **[COMPLIANCE.md](COMPLIANCE.md)**. Bitte markiere Unsicheres als `[ungesichert]`. Dies ist keine Steuerberatung — wir bilden geltendes Recht nach bestem Wissen ab.

## Developer Certificate of Origin (DCO)

Bitte signiere deine Commits (`git commit -s`). Damit bestätigst du das [DCO](https://developercertificate.org/). Das hält dem Projekt die Option offen, die Lizenzierung später anzupassen (z. B. optionales Dual-Licensing), ohne den Closed-Source-SaaS-Schutz der AGPL aufzugeben.

## Tests

- Reine Logik (Money, Steuer, Nummernformat, Hash-Chain, Pflichtangaben): Unit-Tests in `test/unit/`.
- DB-/GoBD-Verhalten (Nummernkreis, Unveränderbarkeit, Storno): Integrationstests in `test/integration/` (eigene SQLite-`test.db`).
- Neue rechtliche Regeln bitte mit einem Test absichern.
