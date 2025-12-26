# File Format

Translation files use the go-i18n v1 JSON format, which supports plurals and descriptive context for translators. This format is used for both UI and content translations.

Files are stored in:
- `app/locales/app/` — for UI strings
- `app/locales/content/` — for seed data content

Each language has its own file (e.g., `en.json`, `fr.json`), structured as a JSON array of translation entries. Each entry contains:

- `id`: Unique key for the string
- `translation`: The translated message, either as a string or pluralized object
- `description`: Context for translators (e.g., usage notes, source location)

Example (`en.json`):
```json
[
  {
    "id": "translations.example_counter",
    "translation": {
      "one": "We have {n} record",
      "other": "We have {n} records"
    },
    "description": "Example counter. {n} is replaced with a number. File: routes/$lang+/examples/translations/basic.tsx:85"
  }
]
```

## Why go-i18n v1? (Technical Background)

https://docs.weblate.org/en/latest/formats.html#translation-types-capabilities

We evaluated several JSON-based translation formats that Weblate supports with plurals and descriptions. The main candidates were:

- go-i18n v1 JSON
- go-i18n v2 JSON
- gotext JSON
- WebExtension JSON
- CSV

We chose go-i18n v1 because:
- It supports plurals and descriptions

Other formats were rejected:
- go-i18n v2: Did not work - failed to support plurals and descriptions during import/export testing
- gotext: Did not work - failed to support plurals and descriptions during import/export testing
- CSV: Did not work - failed to support plurals and descriptions during import/export testing
- WebExtension: Not tried

The format is easy to switch later if needed — only the file reading and writing code must be updated. The rest of the system (context, t functions, etc.) remains unchanged.
