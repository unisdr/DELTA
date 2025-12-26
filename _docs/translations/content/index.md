- [String Extraction](string-extraction)

## Design
Content translations are needed because seed data - such as HIP types, sectors, and assets - is defined in English in SQL migration files but must be displayed in multiple languages. Since this data is static and loaded at startup, we extract translations into JSON files that can be managed in Weblate and loaded alongside UI translations. This keeps the content localizable without requiring database changes.

## Alternative Design Options Considered
- Store translations in database - rejected: too much effort for small static data.
- Use JSON instead of SQL - rejected: no strong benefit, and would require rewriting migration logic.

## Content Translations
This section covers how static content from seed data is translated. Unlike UI strings, this content is defined in SQL migration files and loaded into the database at startup. It includes entries like HIP types, sectors, and assets - all of which are pre-defined and do not change at runtime.

The translation system extracts these strings from the database to generate JSON files used by Weblate. This ensures seed data is available in multiple languages while maintaining traceability and consistency.

## Usage in Code

Use `ctx.dbt()` on the backend to retrieve translated content strings from the translation files. It looks up the correct translation using the `type` and `id`, falling back to the provided `msg` if no translation is found.

Example:
```ts
const rows = await dr.select({
  id: hipTypeTable.id,
  nameEn: hipTypeTable.nameEn,
}).from(hipTypeTable).limit(10).orderBy(hipTypeTable.id);

const hipTypes = rows.map((r) => ({
  ...r,
  name: ctx.dbt({
    type: "hip_type.name",
    id: String(r.id),
    msg: r.nameEn,
  }),
}));
```

> Note: `ctx.dbt()` is only available on the backend. It requires the `type`, `id`, and default message (`msg`). The `type` must match the format used during extraction (e.g., `hip_type.name`).

## Implementation

Content translations are loaded from JSON files stored in `app/locales/content/`, one per language (e.g. `en.json`, `fr.json`). Each file contains an array of `{ id, translation }` entries.

At runtime, `createDatabaseRecordGetter(lang)` loads the translation data for the given language and builds a fast lookup map by `id`.

When `ctx.dbt()` is called:
- It receives a `type`, `id`, and the original English `msg`
- A lookup key is generated using the format: `{type}.{id}.{hash}`, where `hash` is the first 6 characters of the SHA-256 hash of the `msg`
- The system checks the loaded translations for a matching key
- If a match is found, the translated string is returned
- If not found, it falls back to the original `msg`

The hash ensures that if the source text changes, the ID changes, so outdated translations are not used.

No placeholder replacement or pluralization support - this is a simple, static lookup designed for small, fixed content from seed data.
