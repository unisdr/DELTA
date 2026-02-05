import { TranslationGetter } from "~/util/translator";

/*
We create a global createTranslationGetter in init.server.tsx on the server and in frontend/translations.ts for the browser.

It has the same interface but different implementations, so that it works in both server rendered view and views rendered in the browser.

Making it a global is required, since it's impossible to conditionally import different code (to have different implementation) on the server and browser in remix.
*/

declare global {
	var createTranslationGetter: (lang: string) => TranslationGetter;
}

export {};
