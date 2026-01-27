// Translation loader and translator
// Loads JSON translation files by lang code
// Fallbacks to English (en) and provided msg

import { readdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { TParams, Translation, TranslationGetter } from '~/util/translator';

import { createHash } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));


// Cache loaded languages
// file -> lang -> value
const loadedLangs: Record<string, Record<string, any>> = {};


const DEBUG_SUFFIX = "-debug"

const localeDirs = [
	join(__dirname, "..", "locales"),  // yarn dev
	join(__dirname, "locales"),  // build
];

const localeDirApp = "app"
const localeDirContent = "content"


const subDirs = [
	localeDirApp,
	localeDirContent
];


function loadLang(langWithDebug: string): Record<string, any> {
	const lang = langWithDebug.endsWith(DEBUG_SUFFIX)
		? langWithDebug.slice(0, -DEBUG_SUFFIX.length)
		: langWithDebug;

	if (loadedLangs[lang]) return loadedLangs[lang];

	const fileName = `${lang}.json`;
	const result: Record<string, any> = {};

	for (const subDir of subDirs) {
		let found = false;

		for (const localeDir of localeDirs) {
			const filePath = join(localeDir, subDir, fileName);
			try {
				const content = readFileSync(filePath, 'utf-8');
				result[subDir] = JSON.parse(content);
				found = true;
				break; // Exit localeDir loop on success
			} catch (err) {
				continue;
			}
		}

		if (!found) {
			console.warn(`Failed to load locale "${lang}" for subdir "${subDir}" from any location.`);
		}
	}

	loadedLangs[lang] = result;
	return result;
}

export function loadTranslations(lang: string): Record<string, Translation> {
	const raw: any = loadLang(lang)[localeDirApp];
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

	const rawData: RawEntry[] = loadLang(lang)[localeDirApp]; // Now returns the array
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

const availableLanguagesWhiteList = ["en", "ru", "ar"];

export function getAvailableLanguages(): string[] {
	const langSet = new Set<string>();

	for (const subDir of subDirs) {
		for (const localeDir of localeDirs) {
			const dirPath = join(localeDir, subDir);
			try {
				const files = readdirSync(dirPath);
				for (const file of files) {
					if (file.endsWith('.json')) {
						langSet.add(removeFileExtension(file));
					}
				}
			} catch (err) {
				continue;
			}
		}
	}

	return Array.from(langSet).filter(
		(lang) =>
			availableLanguagesWhiteList.includes(lang)
	);
}

function removeFileExtension(filename: string): string {
	return filename.replace(/\.[^/.]+$/, '');
}

// Input params for database record translation
type DbTParams = {
	type: string;   // e.g. "hip_type.name"
	id: string;     // e.g. "1"
	msg: string;    // fallback and hash source
};

type DbTranslation = {
	msg: string;
};

type DbTranslationGetter = (params: DbTParams) => DbTranslation;

function createDatabaseRecordGetter(lang: string): DbTranslationGetter {
	const translations = new Map<string, DbTranslation>();
	const rawData: Array<{ id: string; translation: string }> = loadLang(lang)[localeDirContent] || [];

	if (Array.isArray(rawData)) {
		for (const entry of rawData) {
			if (typeof entry.id === 'string' && typeof entry.translation === 'string') {
				translations.set(entry.id, { msg: entry.translation });
			}
		}
	}

	return function (p: DbTParams): DbTranslation {
		// Reconstruct the full ID with hash
		const hash = createHash("sha256").update(p.msg).digest("hex").slice(0, 6);
		const key = `${p.type}.${p.id}.${hash}`;

		const translation = translations.get(key);
		if (translation) {
			return translation;
		}

		// Fallback to the provided msg (usually the source)
		return { msg: p.msg };
	};
}

export type DbRecordTranslator = (params: DbTParams, replacements?: Record<string, any>) => string;

export function createDbRecordTranslator(lang: string, debug: boolean = false): DbRecordTranslator {
	const getTranslation = createDatabaseRecordGetter(lang);

	return function (params, replacements): string {
		const translation = getTranslation(params);
		let str = translation.msg;

		if (replacements) {
			for (const [key, value] of Object.entries(replacements)) {
				str = str.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
			}
		}

		if (debug) {
			str += ` [${lang}]`;
		}

		return str;
	};
}

