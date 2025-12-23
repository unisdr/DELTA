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
