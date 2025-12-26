- [weblate setup](weblate-setup)

Weblate manages translations for both UI and content.
All non-English translation files in `app/locales/` are owned by Weblate - do not manually edit them.
The base language file (`en.json`) is generated automatically by scripts that extract translation keys from the codebase or database.

There are two string extraction scripts:
- [Extract UI Strings](app-ui/string-extraction)
- [Extract Content Strings](content/string-extraction)
Additionally, we use DeepL to generate initial translations automatically.
When running the extraction with DeepL enabled, the script creates pre-translated JSON files for non-English languages.
These machine-translated strings are then imported into Weblate, where human translators can review and refine them.

This setup ensures consistent, up-to-date source strings and accelerates translation delivery.
- [Use DeepL for Pre-translation](deepl)

# Translation files
- [file format](file-format)
