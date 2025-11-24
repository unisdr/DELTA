export type ParsedLanguage = {
	baseLang: string;
	isDebug: boolean;
};

// Parses a language string, extracting the base language and debug flag.
// Returns null if the base language is not valid.
export function parseLanguageAndDebugFlag(lang: string): ParsedLanguage {
	const isDebug = lang.endsWith('-debug');
	const baseLang = isDebug ? lang.slice(0, -'-debug'.length) : lang;
	return { baseLang, isDebug };
}

export type TParams = {
	code: string;
	msg: string;
	desc?: string;
};

export type TranslationGetter = (params: TParams) => string;

export type Translator = (
	params: TParams,
	replacements?: Record<string, any> | undefined | null
) => string;

export function createTranslator(
	translationGetter: TranslationGetter,
	lang: string,
	debug: boolean,
): Translator {
	return function (params, replacements) {
		let str = translationGetter(params);

		if (replacements) {
			// Replace {key} in msg with values from replacements
			for (const [key, value] of Object.entries(replacements)) {
				str = str.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
			}
		}

		if (debug) str += " " + lang

		return str;
	};
}
