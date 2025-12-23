// Translation loader and translator
// Loads JSON translation files by lang code
// Fallbacks to English (en) and provided msg

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { TParams, Translation, TranslationGetter } from '~/util/translator';


const __dirname = dirname(fileURLToPath(import.meta.url));


// Cache loaded languages
const loadedLangs: Record<string, any> = {
};

const DEBUG_SUFFIX = "-debug"

const localeDirs = [
	join(__dirname, "..", "locales"),  // yarn dev
	join(__dirname, "locales"),  // build
];

// Cache loaded languages
function loadLang(langWithDebug: string): any {
	let lang = langWithDebug
	if (lang.endsWith(DEBUG_SUFFIX)) {
		lang = lang.slice(0, -DEBUG_SUFFIX.length);
	}
	if (loadedLangs[lang]) return loadedLangs[lang];

	const fileName = `${lang}.json`;

	// Try each base directory
	for (const dir of localeDirs) {
		const filePath = join(dir, fileName);
		try {
			const content = readFileSync(filePath, "utf-8");
			loadedLangs[lang] = JSON.parse(content);
			return loadedLangs[lang];
		} catch (err) {
			// Ignore and try the next path
			continue;
		}
	}

	// If all paths fail, return empty
	console.warn(`Failed to load locale "${lang}" from any location.`);
	loadedLangs[lang] = {};
	return {};

}


export function loadTranslations(lang: string): Record<string, Translation> {
	const raw: any = loadLang(lang);
	const result: Record<string, Translation> = {};

	if (!Array.isArray(raw)) {
		console.warn(`Expected translations for ${lang} to be an array`);
		return result;
	}

	for (const entry of raw) {
		if (
			typeof entry !== 'object' ||
			entry === null ||
			typeof entry.id !== 'string'
		) {
			continue;
		}

		if (typeof entry.translation === 'string') {
			result[entry.id] = { msg: entry.translation };
		} else if (typeof entry.translation === 'object' && entry.translation !== null) {
			result[entry.id] = { msgs: { ...entry.translation } };
		}
	}

	return result;
}

type RawEntry = {
	id: string;
	description?: string;
	translation: string | Record<string, string>;
};

type ProcessedEntry =
	| { msg: string }
	| { msgs: Record<string, string> };

export function createTranslationGetter(lang: string): TranslationGetter {
	// Build a simple map: id → translation
	const translations = new Map<string, ProcessedEntry>();

	const rawData: RawEntry[] = loadLang(lang); // Now returns the array
	if (Array.isArray(rawData)) {
		for (const entry of rawData) {
			if (typeof entry.id === 'string' && entry.translation !== undefined) {
				if (typeof entry.translation === 'string') {
					translations.set(entry.id, { msg: entry.translation });
				} else if (typeof entry.translation === 'object') {
					// Assume it's a plural object: { one: "...", other: "..." }
					translations.set(entry.id, { msgs: entry.translation });
				}
			}
		}
	}

	return function (p: TParams): Translation {
		// Try to get by id
		const translation = translations.get(p.code);
		if (translation) {
			return translation;
		}
		// Fallback to inline msg / msgs
		return fallback(p);
	};
}

function fallback(p: TParams): Translation {
	if (p.msgs !== undefined) {
		return { msgs: p.msgs };
	}
	if (p.msg !== undefined) {
		return { msg: p.msg };
	}
	throw new Error("Missing both translation msg and msgs for code: " + p.code);
}
