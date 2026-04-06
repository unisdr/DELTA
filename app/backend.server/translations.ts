// Translation removed - all translation functions return fallback values in English
import { Translation } from "~/utils/dcontext";

export function loadTranslations(_lang: string): Record<string, Translation> {
	// All translations have been removed - return empty object
	// Callers will use fallback English values
	return {};
}

export function getAvailableLanguages(): string[] {
	// Only English is supported
	return ["en"];
}
