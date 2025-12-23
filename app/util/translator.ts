export type ParsedLanguage = {
	baseLang: string;
	isDebug: boolean;
};

// Parses a language string, extracting the base language and debug flag.
export function parseLanguageAndDebugFlag(lang: string): ParsedLanguage {
	const isDebug = lang.endsWith('-debug');
	const baseLang = isDebug ? lang.slice(0, -'-debug'.length) : lang;
	return { baseLang, isDebug };
}

type Message = string | string[];

// msg and msgs are mutually exclusive
export type Translation = {
	msg?: Message;
	msgs?: Record<string, Message>;
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
		let strOrArr: string | string[];

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
				console.error(`Plural translation requested but no integer found in replacements for code: ${params.code}`);
				return `[missing number for plural: ${params.code}]`;
			} else {
				const pr = new Intl.PluralRules(lang);
				const key = pr.select(n) as string;
				strOrArr = translated.msgs[key] ?? translated.msgs.other;

				if (!strOrArr) {
					console.warn(`Missing plural form "${key}" and no "other" in msgs for code: ${params.code}`);
					strOrArr = `Missing plural form for ${params.code}`;
				}
			}
		} else if (translated.msg !== undefined) {
			strOrArr = translated.msg;
		} else {
			console.warn(`No translation returned for code: ${params.code}`);
			strOrArr = `Translation missing for ${params.code}`;
		}

		let str = normalizeString(strOrArr);

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

function normalizeString(strOrArr: string | string[]): string {
	return Array.isArray(strOrArr) ? strOrArr.join('\n') : strOrArr;
}
