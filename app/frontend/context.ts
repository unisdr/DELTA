import { useRouteLoaderData } from "react-router";
import { urlLang } from "~/util/url";
import { UserForFrontend } from "~/util/auth";
import { createTranslator, parseLanguageAndDebugFlag, TranslationGetter, Translator } from "~/util/translator";
import { DContext } from "~/util/dcontext";
import { CommonData } from "~/backend.server/handlers/commondata";
import type {} from '~/types/createTranslationGetter.d';

export class ViewContext implements DContext {
	t: Translator;
	lang: string;
	user: UserForFrontend | null;

	constructor() {
		const rootData = useRouteLoaderData("root") as CommonData;
		const commonData = rootData.common;
		if (!rootData.common.lang) throw new Error("lang not passed to ViewContext");
		this.lang = commonData.lang;
		this.user = commonData.user;

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
}
