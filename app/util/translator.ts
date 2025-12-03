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


export type Translation = {
	msg?: string;
	msgs?: Record<string, string>;
};

export type TParams = {
	code: string;
	desc?: string;
} & Translation;

export type TranslationGetter = (params: TParams) => Translation;

export type Translator = (
	params: TParams,
	replacements?: Record<string, any> | undefined | null
) => string;

export function createTranslator(
	translationGetter: TranslationGetter,
	lang: string,
	debug: boolean
): Translator {
	return function (params, replacements) {
		let str: string;

		// Get translated structure: { msg } or { msgs }
		const translated = translationGetter(params);

		if (translated.msgs !== undefined) {
			const repl = replacements || {};
			let n: number | null = null;

			// Find first integer in replacements
			for (const value of Object.values(repl)) {
				if (typeof value === 'number' && Number.isInteger(value)) {
					n = value;
					break;
				}
			}
			if (n === null) {
				// No number to pluralize with
				str = translated.msgs.other ?? Object.values(translated.msgs)[0] ?? `Missing plural value for ${params.code}`;
			} else {
				const pr = new Intl.PluralRules(lang);
				const key = pr.select(n) as string;
				str = translated.msgs[key] ?? translated.msgs.other;

				if (!str) {
					console.warn(`Missing plural form "${key}" and no "other" in msgs for code: ${params.code}`);
					str = `Missing plural form for ${params.code}`;
				}
			}
		} else if (translated.msg !== undefined) {
			str = translated.msg;
		} else {
			console.warn(`No translation returned for code: ${params.code}`);
			str = `Translation missing for ${params.code}`;
		}

		// Apply replacements: {key} -> value
		if (replacements) {
			for (const [key, value] of Object.entries(replacements)) {
				str = str.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
			}
		}

		// Debug: append language
		if (debug) {
			str += ` [${lang}]`;
		}

		return str;
	};
}

