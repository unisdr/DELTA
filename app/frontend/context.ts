import { useRouteLoaderData } from "react-router";
import { urlLang } from "~/utils/url";
import { UserForFrontend } from "~/utils/auth";
import {
	createTranslator,
	parseLanguageAndDebugFlag,
	Translator,
} from "~/utils/translator";
import { DContext } from "~/utils/dcontext";
import { CommonData } from "~/backend.server/handlers/commondata";
import type {} from "~/types/createTranslationGetter.d";

export interface ViewContextResult extends DContext {
	user: UserForFrontend | null;
}

/**
 * Custom React hook that reads root loader data and returns a fully resolved
 * view context.  All presentation-layer components should call this hook
 * directly rather than instantiating ViewContext with `new`.
 *
 * Throws if root loader data is absent or the lang field is empty, which
 * mirrors the guard that existed in the original ViewContext constructor.
 */
export function useViewContext(): ViewContextResult {
	const rootData = useRouteLoaderData("root") as CommonData;
	// Accessing .common will throw a TypeError if rootData is undefined/null,
	// which is the correct behaviour — callers must not receive silent undefined fields.
	const commonData = rootData.common;

	if (!commonData.lang) {
		throw new Error("lang not passed to ViewContext");
	}

	const lang = commonData.lang;
	const user = commonData.user;

	const { baseLang, isDebug } = parseLanguageAndDebugFlag(lang);
	// createTranslationGetter is a global set by init.server.tsx (SSR) and
	// frontend/translations.ts (browser).  Using a global is necessary because
	// Remix/React Router cannot conditionally load different implementations
	// for the same module path at server vs. browser build time.
	const translationGetter = globalThis.createTranslationGetter(baseLang);
	const t = createTranslator(translationGetter, baseLang, isDebug);

	return {
		t,
		lang,
		user,
		// url is a closure over lang so callers get a stable function reference
		// that reflects the language of the current route without extra arguments.
		url: (path: string) => urlLang(lang, path),
	};
}

/**
 * @deprecated Use useViewContext() instead.
 *
 * Backward-compatible shim retained so that the 101 existing `new ViewContext()`
 * callsites continue to compile and run without modification.  The constructor
 * delegates entirely to useViewContext() and copies all returned fields onto
 * `this`.  Migrate callsites incrementally to `useViewContext()` as part of the
 * P1-12 follow-up sweep.
 *
 * NOTE: calling a hook inside a constructor still violates React's Rules of Hooks.
 * This shim is intentionally temporary; it will be removed once all callsites
 * have migrated to the hook.
 */
export class ViewContext implements ViewContextResult {
	t: Translator;
	lang: string;
	user: UserForFrontend | null;
	url: (path: string) => string;

	constructor() {
		const ctx = useViewContext();
		this.t = ctx.t;
		this.lang = ctx.lang;
		this.user = ctx.user;
		this.url = ctx.url;
	}
}
