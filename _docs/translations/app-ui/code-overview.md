# Code overview

## Core setup

### app/backend.server/translations.ts

Loads translation files.

Exposes `createTranslationGetter(lang: string)` which returns translated strings. It is not used directly. We have a wrapper that handles replacements and additional functionality.

### app/init.server.tsx

Sets up global createTranslator function.

```
globalThis.createTranslationGetter = createTranslationGetter
```

## app/root.tsx

Returns translations from loader and then sets global var with those values.

```
export const loader = async ({ request }: LoaderFunctionArgs) => {
...
	const lang = getLanguageAllowDefault(routeArgs)
	const translations = loadTranslations(lang)
	return Response.json({
			common: {
			lang,
			...
		},
		translations,
...
export default function Screen() {
...
				<script
					dangerouslySetInnerHTML={{ __html: createTranslationScript(lang, translations) }}
				/>
```

### app/frontend/translations.ts

Returns a script (string) that sets createTranslationGetter on globalThis in the browser.

## Functions for translation

## app/util/translator.ts

```
export type Translator = (
	params: TParams,
	replacements?: Record<string, any> | undefined | null
) => string;
```

This function adds replacements support to strings returned by translationGetter. This is the function that is called for actual translations using `t(...)` or `ctx.t(...)`.

## app/backend.server/context.ts

We include translator in the BackendContext that is passed to handlers and model code.

```
export interface BackendContext {
	t: Translator
	...
}
```

## app/frontend/context.ts

We include translator in the ViewContext that is passed to all views.

```
export interface ViewContext {
	t: Translator
	...
}
```

## app/util/context.ts

```
export interface Context {
	lang: string
	t: Translator
	url(path: string): string
}
```

Common interface implemented by `BackendContext` and `ViewContext`.

## Using translations in shared server-side action classes

Some server-side logic lives in reusable classes (e.g. `app/components/ContentRepeater/PreUploadFile.tsx`) rather than directly in route files. These classes receive `request` and `params` from the Remix action handler.

To use translations in such a class:

1. Accept `params` in the action signature alongside `request`:

```typescript
static async action({ request, params }: { request: Request; params: { lang?: string } }) {
```

2. Construct a `BackendContext` using `params` at the top of the action:

```typescript
const ctx = new BackendContext({ params });
```

3. Use `ctx.t()` as normal for any translatable strings:

```typescript
error: ctx.t(
    {
        code: "my_namespace.my_error_key",
        desc: "{placeholder} is replaced with the value.",
        msg: "Something went wrong: {placeholder}",
    },
    { placeholder: someValue },
),
```

The `params.lang` value is provided automatically by Remix when the route is under the `$lang+` path segment — no changes are needed to the route files that export this action.

**Note:** `BackendContext` will throw if `params.lang` is absent. This should not happen for routes under `$lang+`, but if the class is reused in a context without a lang param, handle this defensively or extract the language from the request URL instead.

## Adding a new string to en.json

`locales/app/en.json` is the **source-of-truth** file for English strings. It feeds Weblate, which manages all non-English translations. Follow these rules when editing it:

- **Do not reformat or re-encode the file.** Do not load and re-dump the JSON with any tool (Python `json.dump`, Prettier, etc.) — this corrupts unicode escapes (e.g. `\u003e` → `>`) and creates noisy diffs that touch the whole file.
- **Use a text-based insertion** (e.g. the `edit` tool or manual editing) to add only the new entry.
- **New entries are not automatically translated.** After merging, add the new key to Weblate manually (see [Weblate Programmer Guide](../weblate-programmer-guide.md)) and run DeepL for initial machine translations (see [DeepL guide](../deepl.md)). The string extractor script also regenerates `en.json` — if you run it, ensure it preserves the existing encoding.

Each entry follows this structure:

```json
{
    "description": "{placeholder} describes what it is replaced with. File: path/to/file.tsx:lineNumber",
    "id": "namespace.key_name",
    "translation": "Your English string with {placeholder}"
}
```

Keys are sorted alphabetically by `id`. Insert new entries in the correct position.
