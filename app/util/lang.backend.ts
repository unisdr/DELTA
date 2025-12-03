export type LangRouteParam = {
	params: { lang?: string };
};

export const VALID_LANGUAGES = ["en", "de", "fr"];

export const DEFAULT_LANGUAGE = "en";

const DEBUG_SUFFIX = "-debug"

// Checks if the language is valid, optionally with -debug suffix.
function isValidLanguage(lang: string | undefined): lang is string {
	if (!lang) return false;
	if (lang.endsWith(DEBUG_SUFFIX)) {
		const base = lang.slice(0, -DEBUG_SUFFIX.length);
		return VALID_LANGUAGES.includes(base);
	}

	return VALID_LANGUAGES.includes(lang);
}

export function getLanguageAllowDefault({ params }: LangRouteParam): string {
	const lang = params.lang;
	if (!isValidLanguage(lang)) {
		return DEFAULT_LANGUAGE;
	}
	return lang;
}

export function getLanguage({ params }: LangRouteParam): string {
	const lang = params.lang;
	if (!isValidLanguage(lang)) {
		throw new Response("Not Found", { status: 404 });
	}
	return lang;
}

export function ensureValidLanguage(args: LangRouteParam) {
	getLanguage(args);
}
