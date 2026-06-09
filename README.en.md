<div align="center">

# OpenInvoice Germany

**Free, self-hostable open-source invoicing software for Germany.**
E-invoice (XRechnung / ZUGFeRD) · GoBD · § 14 UStG · small-business § 19 · GDPR

Licence: **AGPL-3.0** · [Deutsch](README.md)

</div>

> **Why?** From 2025 German B2B must be able to *receive* structured e-invoices; from 2027/2028 *sending* becomes mandatory. Many freelancers and SMEs pay monthly just to stay compliant. This project makes it **free** — you host it yourself, your data stays with you.

> ⚠️ **Not tax or legal advice.** GoBD compliance additionally requires the user's own process documentation. All legal references with sources live in **[COMPLIANCE.md](COMPLIANCE.md)** (German). No warranty.

## Features

GoBD core (immutable finalisation, gapless number ranges, append-only audit hash-chain, cancellation instead of deletion) · § 14 UStG mandatory-field enforcement · tax schemes (standard, small-business § 19, reverse charge § 13b, intra-EU, margin scheme § 25a, small amount § 33) · **XRechnung** (UBL, EN 16931) export with EN-16931 core-rule validation · PDF export · SQLite-solo or PostgreSQL via Docker.

## Quick start (solo / SQLite)

```bash
git clone https://github.com/automationsmanufaktur-labs/open-invoice-germany.git
cd open-invoice-germany
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed      # optional demo data
npm run dev          # http://localhost:3000
```

## Tests

```bash
npm test   # money, tax, number ranges, GoBD immutability, hash-chain, EN 16931
```

## E-invoice validation

Local/tests: EN-16931 core rules in pure JavaScript (no Java). CI: the official [KoSIT validator](https://github.com/itplr-kosit/validator) checks a generated XRechnung against the EN-16931/XRechnung Schematron (`.github/workflows/ci.yml`).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Legal corrections must cite the source (statute / BMF letter) against [COMPLIANCE.md](COMPLIANCE.md).

## Licence

**[AGPL-3.0](LICENSE).** Use, modify and self-host freely. Operating it as a network service requires making the (modified) source available to users — keeping the project free for everyone.
