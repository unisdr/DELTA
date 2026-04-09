## Layer 9 — i18n / Translation System

### Inventory

```
locales/
  app/         — UI string translations (en, ar, es, fr, ru, zh)
  content/     — DB content translations (en, ar, es, fr, ru, zh)
  api-cache/   — DeepL API cache (data.json, prevents re-billing duplicate strings)

scripts/
  extractor-i18n.ts          — AST extractor: scans .t() calls → writes locales/app/en.json
  export_tables_for_translation.ts  — DB exporter: reads DB → writes locales/content/en.json
  import_translation_tables.ts      — DB importer: reads locales/content/*.json → merges into DB JSONB
  delta-string-extractor/    — Go binary (ts-morph wrapper, used by extractor)
  delta-deepl-translate/     — Go tool: reads en.json → calls DeepL API → writes ar/es/fr/ru/zh.json

app/
  backend.server/translations.ts   — Server: reads locale JSON files, createTranslationGetter, loadTranslations
  frontend/translations.ts         — Browser: createTranslationScript (serialises to window.DTS_TRANSLATIONS)
  utils/translator.ts              — createTranslator, createMockTranslator, TParams/Translation types
  utils/lang.backend.ts            — VALID_LANGUAGES, getLanguage(), getLanguageAllowDefault()
  types/createTranslationGetter.d.ts — globalThis type declaration
  backend.server/services/translationDBUpdates/
    update.ts    — importTranslationsIfNeeded() — startup auto-import of content translations
    sources.ts   — getTranslationSources() — queries DB tables for English source text + hash IDs
```

---

### Architecture — Two separate pipelines

**Pipeline 1 — UI strings** (`locales/app/`)

These are developer-written strings embedded in TypeScript via `ctx.t({ code: "...", msg: "..." })`.

Flow:

1. Developer writes `.t()` call with a `code` key and English `msg` fallback
2. `yarn i18n:extractor` → `extractor-i18n.ts` uses `ts-morph` to AST-scan all `app/**/*.ts(x)` files, extracts every `.t(...)` call, writes `locales/app/en.json`
3. `delta-deepl-translate` Go tool → calls DeepL API → writes `locales/app/{ar,es,fr,ru,zh}.json`. Uses placeholder neutralisation: `{foo}` → `{0}` before sending to DeepL, restored after (prevents DeepL translating variable names)
4. All JSON files committed to repo

**Pipeline 2 — Content strings** (`locales/content/`)

These are data strings stored in DB JSONB columns (sector names, asset categories, HIP type/cluster/hazard names).

Flow:

1. `yarn export_tables_for_translation` → `export_tables_for_translation.ts` queries DB for English (`->>'en'`) values from sector, asset, HIP tables → writes `locales/content/en.json` with deterministic hash IDs (`type.uuid.sha256[:6]`)
2. `delta-deepl-translate` Go tool → translates → writes `locales/content/{ar,es,fr,ru,zh}.json`
3. `yarn import_translation_tables` or automatic startup call → `importTranslationsIfNeeded()` reads locale files, validates against current DB state (rejects stale hashes), merges translations into DB JSONB columns via `jsonb || translations::jsonb`

---

### Runtime delivery

**Server startup:** `init.server.tsx` sets `globalThis.createTranslationGetter = createTranslationGetter` (from `backend.server/translations.ts`). Reads JSON files from `locales/app/` once via `fs.readFileSync`, caches in module-level `loadedLangs` map.

**Per request:**

- Root loader (`root.tsx:108`) calls `loadTranslations(lang)` — returns all ~1,700 entries for the requested language from the in-memory cache
- Returns them in the loader JSON payload
- Root component (`root.tsx:310`) injects them as an inline `<script>` tag via `createTranslationScript` setting `window.DTS_TRANSLATIONS`

**Both server (SSR) and client (hydration/SPA navigation)** call `ctx.t({ code, msg })` which calls `globalThis.createTranslationGetter(lang)(params)`. On the server this hits the file-based map; in the browser it hits `window.DTS_TRANSLATIONS`. The API is identical — explained by `app/types/createTranslationGetter.d.ts`.

**Six supported languages:** ar, zh, en, fr, ru, es (all have locale files)

---

### Gap 1: `export_tables_for_translation.ts` writes to directory path — script is broken

`scripts/export_tables_for_translation.ts:26`:

```ts
const filePath = path.resolve(process.cwd(), "locales", "content");
// ↑ resolves to the content/ directory, not a file
fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
// ↑ EISDIR — cannot write to a directory
```

A commented-out line in the same file shows the original intent: `'app/locales/content/en.json'`. The `/en.json` filename was dropped, breaking the script entirely. `locales/content/en.json` was created by a previous correct version and has not been regenerated since.

**Plan item:** P0-17

---

### Gap 2: Two language lists, out of sync — fr, es, zh silently unreachable via UI

`VALID_LANGUAGES` (`utils/lang.backend.ts:5`) = `["ar", "zh", "en", "fr", "ru", "es"]` — 6 languages. Used by the router to validate the `$lang` URL segment.

`availableLanguagesWhiteList` (`backend.server/translations.ts:140`) = `["en", "ru", "ar"]` — 3 languages. Used by `getAvailableLanguages()`, which feeds the language picker dropdown (settings/system.tsx:68) and the settings validation in `settingsService.ts:65`.

Result: fr/es/zh translations are complete (~6,791 lines each) but the UI never exposes them. Users can access `/{lang}/...` URLs directly if they know the code, but cannot select those languages from any UI surface.

The two constants live in separate files with no import relationship — a developer adding a 7th language to `VALID_LANGUAGES` will not know to update `availableLanguagesWhiteList`.

**Plan item:** P1-34

---

### Gap 3: Content translation size discrepancy

`locales/content/en.json` — 7,094 lines  
`locales/content/{ar,es,fr,ru,zh}.json` — 8,918 lines each (+1,824 lines)

The non-English content files are significantly larger than the English source. This is a direct consequence of Gap 1 — the English export script is broken and has not been re-run since the last correct version. DB rows added since then have their `en` JSONB value but no corresponding entry in `locales/content/en.json`. The translated files contain those rows (from when they were first exported and translated) but the English source does not. The ~1,824-line gap represents content that exists in all 5 translated languages but whose English source export is out of date.

`importTranslationsIfNeeded()` handles this gracefully — stale hash IDs are silently skipped. No runtime error. But the gap will widen with every new DB row until P0-17 is fixed and the export is regenerated.

---

### Gap 4: `loadTranslations` and `createTranslationGetter` — duplicated logic in the same file

`backend.server/translations.ts` exports two functions with near-identical behaviour:

- `loadTranslations(lang)` — called from `root.tsx`, returns `Record<string, Translation>` for the browser payload
- `createTranslationGetter(lang)` — set on `globalThis` at startup, returns a `TranslationGetter` closure over a `Map`

Both call `loadLang()` (shared cache) and iterate the same raw JSON array. The duplication means a behaviour change (e.g. fallback logic, plural handling) must be applied in two places.

**Plan item:** P1-35

---

### Gap 5: Full translation dictionary injected into every HTML page — will not scale

Every page request:

1. Loads all ~1,700 translation entries from the in-memory cache
2. Serialises them into an inline `<script>` tag (~133KB uncompressed, ~35KB gzipped)
3. Also includes them in the React Router hydration JSON payload

Two problems:

**No browser caching.** Inline scripts are part of the HTML document — the browser cannot cache them separately. Every full-page navigation re-downloads the entire dictionary even if no strings changed.

**No per-route splitting.** A user on the analytics dashboard downloads translations for admin forms, settings screens, and disaster record pages they are not viewing. Modern i18n libraries support namespace-based lazy loading.

As the app grows this payload grows linearly. At 5× current string count (~8,500 entries) the uncompressed payload exceeds 600KB.

**Plan item:** P3D-1

---

### Gap 6: Duplicate translation keys silently dropped — no CI enforcement

`extractor-i18n.ts:136`: When two `.t()` call sites share the same `code`, the second occurrence is silently skipped (`duplicateCount++; return`). The count is logged as a warning but does not fail the script. Duplicate keys are undetectable in the output — translators working on non-English files see one entry, but it applies to two distinct UI strings. The fix is a single `process.exit(1)` guard.

**Plan item:** P1-36

---

### Already tracked — reference only

- **P2-6** — `importTranslationsIfNeeded()` called without `await` at startup (translation import races with first requests)

---

### What works well

- `globalThis.createTranslationGetter` dual-runtime design — same call-site API on server and client, different underlying implementations, explained by `app/types/createTranslationGetter.d.ts`. Clever solution to Remix's inability to conditionally import different module implementations
- Deterministic hash IDs for content keys (`type.uuid.sha256[:6]`) — stale translations are automatically rejected at import time without a separate migration
- DeepL placeholder neutralisation (`{foo}` → `{0}` before API call, restored after) — variable names survive translation intact
- `Intl.PluralRules` in `createTranslator` — correct locale-aware plural forms, not hardcoded singular/plural
- Debug mode (`-debug` lang suffix) appending ` [lang]` to all strings — lets developers instantly see which strings are missing translation
- Module-level `loadedLangs` cache — locale JSON files read from disk once per process lifetime, no per-request I/O
- DeepL API response cache in `locales/api-cache/data.json` — prevents re-billing for unchanged strings on subsequent runs

---

