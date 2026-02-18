import { configPublicUrl } from "~/utils/config";
import { urlLang } from "~/utils/url";
import { LangRouteParam } from "~/utils/lang.backend";
import {
	createTranslator,
	parseLanguageAndDebugFlag,
	TranslationGetter,
	Translator,
} from "~/utils/translator";
import { DContext } from "~/utils/dcontext";
import type {} from "~/types/createTranslationGetter.d";

export class BackendContext implements DContext {
	lang: string;

	t: Translator; // General translator (from main.json, etc.)

	//countryAccountID

	constructor(routeArgs: LangRouteParam) {
		if (!routeArgs.params.lang)
			throw new Error("BackendContext: lang param does not exist on route");

		this.lang = routeArgs.params.lang;

		{
			const { baseLang, isDebug } = parseLanguageAndDebugFlag(this.lang);

			let translationGetter: TranslationGetter;
			translationGetter = globalThis.createTranslationGetter(baseLang);

			this.t = createTranslator(translationGetter, baseLang, isDebug);
		}
	}

	url(path: string): string {
		return urlLang(this.lang, path);
	}

	fullUrl(path: string): string {
		let prefix = configPublicUrl();
		if (!prefix) {
			return "invalid-link-env-is-missing-public-url";
		}
		return prefix + urlLang(this.lang, path);
	}

	rootUrl(): string {
		let r = configPublicUrl();
		if (!r) {
			return "invalid-link-env-is-missing-public-url";
		}
		return r;
	}
}

export const createTestBackendContext = () => {
	return new BackendContext({ params: { lang: "en" } });
};
