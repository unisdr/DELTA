import { urlLang } from "~/util/url";
import { UserForFrontend } from "~/util/auth";
import { createTranslator, parseLanguageAndDebugFlag, TranslationGetter, Translator } from "~/util/translator";

export class ViewContext {
	t: Translator;
	lang: string;
	user: UserForFrontend | null;

	constructor(data: {
		common: {
			lang: string,
			user: UserForFrontend | null
		}
	}) {
		if (!data.common.lang) throw new Error("lang not passed to ViewContext");
		this.lang = data.common.lang;
		this.user = data.common.user;

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
}
