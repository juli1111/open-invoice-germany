# Sicherheitshinweise

## Schwachstellen melden

Bitte melde Sicherheitslücken **nicht** über öffentliche Issues. Nutze stattdessen:

- GitHub **Security Advisories** („Report a vulnerability" im Reiter *Security* des Repos), oder
- E-Mail an die im Repo hinterlegte Kontaktadresse des Maintainers.

Wir bestätigen den Eingang i. d. R. innerhalb weniger Tage und halten dich über den Fortschritt auf dem Laufenden. Bitte gib uns angemessene Zeit zur Behebung, bevor du Details veröffentlichst (Responsible Disclosure).

## Hinweise zum sicheren Betrieb

- **Aufbewahrung & DSGVO**: Rechnungsdaten unterliegen gesetzlichen Aufbewahrungsfristen (siehe [COMPLIANCE.md](COMPLIANCE.md)). Lösch-/Sperrkonzept beachten.
- **Backups**: SQLite-Datei (`prisma/dev.db`) bzw. die PostgreSQL-Datenbank regelmäßig sichern. Die GoBD-Audit-Chain schützt vor *unbemerkter* Manipulation, ersetzt aber keine Backups.
- **Secrets**: Niemals echte Zugangsdaten committen. Alles über `.env` (ist in `.gitignore`).
- **Self-Hosting**: Die App hat (im MVP) noch keine eingebaute Authentifizierung — betreibe sie nur in einem geschützten Netz / hinter einem Auth-Proxy, bis Multi-User-Auth verfügbar ist.
