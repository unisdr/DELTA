export type LangRouteParam = {
	params: { lang?: string };
};

export const VALID_LANGUAGES = [
	"en", "de"] as const;

export const DEFAULT_LANGUAGE = "en"

export type Language = (typeof VALID_LANGUAGES)[number];

function isValidLanguage(lang: string|undefined): boolean {
	return VALID_LANGUAGES.includes(lang as Language);
}

export function getLanguageAllowDefault({ params }: LangRouteParam): Language {
	const lang = params.lang;
	if (!isValidLanguage(lang)){
		return DEFAULT_LANGUAGE
	}
	return lang as Language
}

export function getLanguage({ params }: LangRouteParam): Language {
	const lang = params.lang;
	if (!isValidLanguage(lang)){
		throw new Response("Not Found", { status: 404 });
	}
	return lang as Language
}

export function ensureValidLanguage(args: LangRouteParam) {
	const lang = args.params.lang;
	if (!isValidLanguage(lang)) {
		throw new Response("Not Found", { status: 404 });
	}
}
