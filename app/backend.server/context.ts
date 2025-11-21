import { configPublicUrl } from "~/util/config";
import { Translator } from "~/backend.server/translations"
import { urlLang } from "~/util/url";
import { LangRouteParam } from "~/util/lang.backend";

export class BackendContext {
	lang: string
	t: Translator
	//countryAccountID

	constructor(routeArgs: LangRouteParam) {
		if (!routeArgs.params.lang) throw new Error("BackendContext: lang param does not exist on route")
		this.lang = routeArgs.params.lang
		// @ts-ignore
		this.t = globalThis.createTranslator(this.lang);
	}

	url(path: string): string {
		return urlLang(this.lang, path);
	}

	fullUrl(path: string): string {
		let prefix = configPublicUrl()
		if (!prefix){
			return "invalid-link-env-is-missing-public-url";
		}
		return prefix + urlLang(this.lang, path);
	}

	rootUrl(): string {
		let r = configPublicUrl()
		if (!r){
			return "invalid-link-env-is-missing-public-url";
		}
		return r
	}
}



