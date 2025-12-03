// Translation loader and translator
// Loads JSON translation files by lang code
// Fallbacks to English (en) and provided msg

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { TParams, Translation, TranslationGetter } from '~/util/translator';

const __dirname = dirname(fileURLToPath(import.meta.url));

type TranslationEntry = { defaultMessage: string; description?: string };
type Translations = Record<string, TranslationEntry>;

// Cache loaded languages
const loadedLangs: Record<string, Translations> = {
};

const DEBUG_SUFFIX = "-debug"

// Cache loaded languages
function loadLang(langWithDebug: string): Translations {
	let lang = langWithDebug
	if (lang.endsWith(DEBUG_SUFFIX)) {
		lang = lang.slice(0, -DEBUG_SUFFIX.length);
	}
	if (loadedLangs[lang]) return loadedLangs[lang];
	try {
		const filePath = join(__dirname, "..", 'locales', `${lang}.json`);
		const content = readFileSync(filePath, 'utf-8');
		loadedLangs[lang] = JSON.parse(content);
		return loadedLangs[lang];
	} catch {
		loadedLangs[lang] = {};
		return {};
	}
}

// Load flat record of translations. Only defaultMessage (the actual string, not other fields, such as descriptions)
export function loadTranslations(lang: string): Record<string, string> {
	const raw: Translations = loadLang(lang);
	const flat: Record<string, string> = {};
	for (const key in raw) {
		const entry = raw[key];
		if (entry?.defaultMessage !== undefined) {
			flat[key] = entry.defaultMessage;
		}
	}
	return flat;
}

const defaultLang = "en";

// Create translator for lang; fallback to en or passed message
export function createTranslationGetter(lang: string): TranslationGetter {
	return (p: TParams): Translation => {
		if (p.msg !== undefined) {
			return {msg: p.msg};
		} else if (p.msgs !== undefined) {
			return {msgs: p.msgs};
		} else {
			throw new Error("missing both translation msg and msgs");
		}
		/*
		const { code, msg } = p;
		const data = loadLang(lang);
		if (data[code]?.defaultMessage !== undefined) {
			return data[code].defaultMessage
		}
		const dataDefautlLang = loadLang(defaultLang)
		return dataDefautlLang[code]?.defaultMessage ?? msg
	 */
	};
};

