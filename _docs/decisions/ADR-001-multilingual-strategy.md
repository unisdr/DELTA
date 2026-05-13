# ADR-001: Multi-lingual Strategy

## Status
Proposed

## Date
2026-05-12

## Context

DELTA is a multi-tenant application supporting UN member states across multiple languages (currently en, ar, ru, with fr, es, zh partially available). The existing translation system uses a custom `ViewContext.t({code, msg})` pattern with flat per-language JSON files, a custom key extractor (`yarn i18n:extractor`), and Weblate for translator workflow. The system has several known gaps (see P1-34, P1-35, P1-36 in the Phase 1 structural report).

As part of the Clean Architecture migration, new domains need a proper, standards-based i18n foundation. Decisions here apply to new domains written during the strangler fig migration — the existing system is not replaced wholesale.

Two fundamentally different translation concerns exist and must remain separate:
1. **UI strings** — component labels, button text, form fields. Extracted from source, stored in locale JSON files.
2. **Content translations** — translatable data stored in the database (event names, sector labels, etc.) managed via Weblate with content-hash IDs.

## Decision

### Library — Frontend
New domain presentation layers use **`react-i18next`** with **`remix-i18next`** for SSR hydration.

`remix-i18next` manages the server/client split: the server reads locale files from disk (`i18next-fs-backend`), serialises translations into the HTML payload, and the client hydrates without a separate HTTP fetch. The generic `HttpBackend` is not used — it would cause an internal HTTP round-trip during SSR.

The old `ViewContext.t({code, msg})` system is left untouched until each domain is rewritten via the strangler fig. Old and new systems coexist during migration.

### Library — Backend (external API surface)
`nestjs-i18n` is adopted only when NestJS exposes external HTTP endpoints. For the current phase (NestJS as application context, no HTTP server), locale is passed as an explicit `string` parameter to every use case `execute()` method — no framework resolver magic.

### I18nService in the Domain Layer
Each domain exposes an `I18nService` port in its application layer. The service translates server-originated text (validation errors, API error messages, notification strings). It receives `locale: string` as an explicit parameter — it does not read from HTTP context. The infrastructure layer provides the implementation.

### File Structure
Namespace-per-domain, one file per language per domain:

```
locales/
  en/
    common.json
    notices.json
    hazardous-event.json
  fr/
    common.json
    notices.json
    hazardous-event.json
```

Key hierarchy within the JSON file handles sub-concerns (form fields, list columns, errors). Splitting a domain into multiple files is only considered if a single file exceeds ~500 keys — at that point the domain boundary is the real problem.

The existing flat per-language files (`locales/en.json` etc.) remain for the old system until each domain is migrated.

### Locale Resolution Chain

```
1. URL path segment        /fr/hazardous-event  → "fr"
2. user.preferredLocale    from user record (column does not exist yet — falls through gracefully)
3. tenant.defaultLocale    from country_accounts record
4. "en"                    system default
```

Resolution is null-safe at every step. The `user.preferredLocale` column is added when the user settings domain is built — the resolver works correctly without it today.

### External REST API Locale
The external API (`/api/v2/...`) does **not** include lang in the URL path. Locale is resolved from the authenticated token context using the same chain above. Consumers may optionally override per-request via the standard `Accept-Language` HTTP header, which takes precedence when provided.

### Translation Platform
**Weblate** — already in use, open-source, self-hostable, appropriate for a DPG project. No migration to paid platforms (Lokalise, Crowdin).

### Key Extraction
Two parallel extraction pipelines:
- **Old system**: custom `scripts/extractor-i18n.ts` (scans `t({code, msg})` syntax). Fixed to exit non-zero on duplicate keys (P1-36).
- **New domains**: `i18next-parser` (scans `t('key')` syntax). Runs in CI alongside the custom extractor, targeting `locales/` namespace files.

### Formatting
Native `Intl` API for all locale-aware formatting (numbers, currency display, dates). Formatter instances are cached to avoid expensive object reconstruction on each call. Pluralisation uses i18next's built-in `_one`/`_other` suffix convention — no if/else in components.

## Consequences

- New domain components are testable without a full router context (react-i18next provides a test provider)
- Old components are undisturbed until their domain is rewritten — zero migration risk for existing functionality
- Two extraction tools run in CI — marginal overhead, clearly separated by syntax
- `I18nService` interface in the domain layer means locale handling is swappable and testable with a mock
- The `user.preferredLocale` column being absent today has no visible impact — the resolver silently falls through to tenant default

## References

- [P1-34: Language availability mismatch](../refactoring-plan/phases/phase-1-structural.md)
- [P1-35: Duplicate translation loading logic](../refactoring-plan/phases/phase-1-structural.md)
- [P1-36: Fail build on duplicate translation keys](../refactoring-plan/phases/phase-1-structural.md)
- [remix-i18next](https://github.com/sergiodxa/remix-i18next)
- [ADR-002: Timezone Handling](ADR-002-timezone-handling.md) — locale and timezone are resolved independently, same chain pattern
