import { createMockTranslator, Translator } from "./translator";

// D prefix for Delta. Using this name instead of Context so that auto-complete could import the right file, since Context is a common name otherwise.
export interface DContext {
	lang: string;
	t: Translator;
	url(path: string): string;
}

export function createTestDContext(): DContext {
	const t = createMockTranslator();

	return {
		lang: "en",
		t: t,
		url: (path: string) => `/en/${path}`,
	};
}
