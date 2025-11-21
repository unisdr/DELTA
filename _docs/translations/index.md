# Translations

- [code overview](code-overview)

# Options for setting language
- URL path: /en-us/route
- Query param: ?lang=en-us
- Cookie

In general being able to link to specific language is valuable so having it in URL is better. Between two URL option path looks nicer. For a lot of link we build links like `route + item.id` or similar. Could actually be easier to add it to path than query param.

Decision: add in path

# Translation files
Translation files are stored in the `translations/` directory as JSON files, one per language (e.g., `en.json`, `de.json`). Each file contains a JSON object where keys are message codes and values are objects with at least a `defaultMessage` field, and optionally a `description`.

Example (`en.json`):
```json
{
  "greeting": {
    "defaultMessage": "Hello!",
    "description": "A common greeting"
  }
}
```

# Design

Translation in code calls:
TODO

Translation files are loaded synchronously at runtime using Node.js `fs`. The system caches translations in memory on first access to avoid repeated file reads. If a translation file is missing or a key is not found, the system falls back first to the default language (`en`) and then to the `msg` value provided at call time.


# Examples

`app/routes/examples/translations/basic`

Basic example showing calling translation in backend code (loader) and views (that are renders both on server and client).
