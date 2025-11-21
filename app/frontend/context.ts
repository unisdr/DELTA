import { urlLang } from "~/util/url";
import { Translator } from "./translations"
import { UserForFrontend } from "~/util/auth";

export class ViewContext {
	t: Translator;
	lang: string;
	user: UserForFrontend | null;

	constructor(data: { common: { lang: string, user: UserForFrontend | null } }) {
		if (!data.common.lang) throw new Error("lang not passed to ViewContext")
		this.lang = data.common.lang;
		this.user = data.common.user
		// @ts-ignore
		this.t = globalThis.createTranslator(this.lang);
	}

	url(path: string): string {
		return urlLang(this.lang, path);
	}
}
