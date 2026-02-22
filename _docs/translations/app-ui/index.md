- [code overview](code-overview.md)
- [string extraction](string-extraction.md)

## Key Features

- Unified API: ctx.t works the same on server and client
- Message IDs: Every string has a unique code used for translation lookup
- Default messages: Provided via msg (singular) or msgs (plural), used as fallback when translation is missing
- Placeholders: Supports dynamic values like {n} - automatically preserved during translation
- Descriptions: Optional desc field gives context to translators
- Pluralization: Use msgs with keys like one, other for language-aware plural forms

For full usage examples, see:
routes/$lang+/examples/translations/basic

## Design

Translation files are loaded synchronously at runtime using Node.js `fs`. The system caches translations in memory on first access to avoid repeated file reads. If a translation file is missing or a key is not found, the system falls back to the `msg` value provided at call time.

## Possible Improvements

### Namespaces (not planned)

Currently all translations are loaded together. While splitting into namespaces could reduce payload size per page, the total translation size is expected to stay under 200KB per language (2026-01-30 current compressed is 34KB) - small compared to overall app size (~4.2MB). Namespaces are not needed.
