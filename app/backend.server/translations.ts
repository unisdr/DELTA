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

// Cache loaded languages
function loadLang(langWithDebug: string): any {
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
	const raw: any = loadLang(lang);
	return removeDescriptions(raw);
}

function removeDescriptions(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  // Check if all values in this object are strings → it's a leaf
  const isLeaf = Object.values(obj).every(value => typeof value === 'string');

  if (isLeaf) {
    // Remove 'description' field if it exists
    const { description, ...rest } = obj;
    return rest;
  }

  // Recurse into object properties
  const result: any = {};
  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      result[key] = removeDescriptions(obj[key]);
    }
  }

  return result;
}

const defaultLang = "en";

export function createTranslationGetter(lang: string): TranslationGetter {
	return (p: TParams): Translation => {
		const data = loadLang(lang);
		if (!data) {
			return fallback(p);
		}

		// Step 1: Try direct key (e.g. data["translations.example_counter"])
		const direct = data[p.code];
		if (direct !== undefined) {
			if (typeof direct === 'object' && direct !== null && typeof direct.description === 'string') {
				const { description, ...msgsWithoutDesc } = direct;
				return { msgs: msgsWithoutDesc };
			}
			// If it's an object without `description` or invalid -> ignore and continue
		}

		// Step 2: Try path traversal: "a.b.c" -> data.a.b.c
		const parts = p.code.split('.');
		let current: any = data;

		for (const part of parts) {
			if (current == null || typeof current !== 'object') {
				break;
			}
			current = current[part];
		}

		if (current !== undefined && typeof current === 'object' && typeof current.description === 'string') {
			const { description, ...msgsWithoutDesc } = current;
			return { msgs: msgsWithoutDesc };
		}

		// Step 3: Fallback to p.msgs or p.msg (direct params)
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
