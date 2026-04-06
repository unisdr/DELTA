import { configPublicUrl } from "~/utils/config";
import { LangRouteParam } from "~/utils/lang.backend";
import { createMockTranslator, DContext, Translator } from "~/utils/dcontext";

export class BackendContext implements DContext {
	lang: string = "en"; // Translation removed - always use English
	t: Translator; // Translator with English-only fallbacks

	constructor(_routeArgs: LangRouteParam) {
		// Translation removed - always use English
		this.lang = "en";

		this.t = createMockTranslator();
	}

	url(path: string): string {
		// Translation removed - don't add language prefix
		const normalizedPath = path.startsWith("/") ? path : `/${path}`;
		return normalizedPath;
	}

	fullUrl(path: string): string {
		let prefix = configPublicUrl();
		if (!prefix) {
			return "invalid-link-env-is-missing-public-url";
		}
		// Translation removed - don't add language prefix
		const normalizedPath = path.startsWith("/") ? path : `/${path}`;
		return prefix + normalizedPath;
	}

	rootUrl(): string {
		let r = configPublicUrl();
		if (!r) {
			return "invalid-link-env-is-missing-public-url";
		}
		return r;
	}
}

export const createTestBackendContext = () => {
	return new BackendContext({ params: { lang: "en" } });
};
