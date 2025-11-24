import { configPublicUrl } from "~/util/config";
import { urlLang } from "~/util/url";
import { LangRouteParam } from "~/util/lang.backend";
import { createTranslator, parseLanguageAndDebugFlag, TranslationGetter, Translator } from "~/util/translator";

export class BackendContext {
	lang: string
	t: Translator
	//countryAccountID

	constructor(routeArgs: LangRouteParam) {
		if (!routeArgs.params.lang) throw new Error("BackendContext: lang param does not exist on route")

		this.lang = routeArgs.params.lang;

		{
			const { baseLang, isDebug } = parseLanguageAndDebugFlag(this.lang);

			let translationGetter: TranslationGetter;
			// @ts-ignore
			translationGetter = globalThis.createTranslationGetter(baseLang);

			this.t = createTranslator(translationGetter, baseLang, isDebug);
		}

	}

	url(path: string): string {
		return urlLang(this.lang, path);
	}

	fullUrl(path: string): string {
		let prefix = configPublicUrl()
		if (!prefix) {
			return "invalid-link-env-is-missing-public-url";
		}
		return prefix + urlLang(this.lang, path);
	}

	rootUrl(): string {
		let r = configPublicUrl()
		if (!r) {
			return "invalid-link-env-is-missing-public-url";
		}
		return r
	}
}



