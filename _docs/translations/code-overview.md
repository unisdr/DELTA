# Code overview

## app/backend.server/translations.ts
Loads translation files.
Exposes `createTranslator(lang: string)` which returns a function that returns translated string based on passed translation entry.

## app/frontend/translations.ts
Type signature for translation call.
```
export type TParams = { code: string; msg: string; desc?: string };
export type Translator = (p: TParams) => string;
```

## app/init.server.tsx
Sets up global createTranslator function.
```
globalThis.createTranslator = createTranslator
```

## app/root.tsx
Returns translations from loader and then sets global var with those values.

```
export const loader = async ({ request }: LoaderFunctionArgs) => {
	const lang = "de";
	const translations = loadTranslations(lang)
	return Response.json({
		lang,
		translations,
......

export default function Screen() {
	const translationScript = `
    // eslint-disable-next-line
    window.DTS_TRANSLATIONS = ${JSON.stringify(translations)};
    window.DTS_LANG = ${JSON.stringify(lang)};
		globalThis.createTranslator = function (_lang) {
  return function (p) {
    if (typeof globalThis.DTS_TRANSLATIONS === 'object') {
      return globalThis.DTS_TRANSLATIONS[p.code] ?? p.msg;
    }
    return p.msg;
  };
};
  `;
	
	return (
		<html lang="en">
			<head>
				<script
					dangerouslySetInnerHTML={{ __html: translationScript }}
				/>
```


## app/backend.server/models/context.ts
We include translator in the ModelContext that is passed to all database queries.
```
export interface ModelContext {
	t: Translator
	tx: Tx
	countryAccountID: string
}
```

## app/frontend/models/context.ts
We include translator in the ViewContext that is passed to all views.
```
export interface ViewContext {
	t: Translator
}
```

