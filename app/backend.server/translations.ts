// Translation loader and translator
// Loads JSON translation files by lang code
// Fallbacks to English (en) and provided msg

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { TParams } from '~/util/translator';

const __dirname = dirname(fileURLToPath(import.meta.url));

type TranslationEntry = { defaultMessage: string; description?: string };
type Translations = Record<string, TranslationEntry>;

// Cache loaded languages
const loadedLangs: Record<string, Translations> = {
};

// Cache loaded languages
function loadLang(lang: string): Translations {
  if (loadedLangs[lang]) return loadedLangs[lang];
  try {
    const filePath = join(__dirname, "..",  'locales', `${lang}.json`);
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
export function createTranslationGetter(lang: string) {
  return (p: TParams): string => {
    const { code, msg } = p;
    const data = loadLang(lang);
		if (data[code]?.defaultMessage !== undefined){
			return data[code].defaultMessage
		}
		const dataDefautlLang = loadLang(defaultLang)
		return dataDefautlLang[code]?.defaultMessage ?? msg
  };
};

