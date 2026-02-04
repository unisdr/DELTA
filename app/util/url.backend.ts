import { DEFAULT_LANGUAGE, getLanguage, LangRouteParam } from "./lang.backend";
import { redirect } from "react-router";
import { urlLang } from "./url";

export function replaceLang(path: string, lang: string): string {
  const parts = path.split('/');
  parts[1] = lang;
  return parts.join('/');
}

// build a language-prefixed URL path
export function urlLangFromRoute(
  routeArgs: LangRouteParam,
  path: string
): string|null {
  const lang = getLanguage(routeArgs);
	if (!lang){
		return null
	}
	return urlLang(lang, path)
}

export function urlDefaultLang(
  path: string
): string {
	return urlLang(DEFAULT_LANGUAGE, path)
}

// redirect
export function redirectLang(
  lang: string,
  path: string
): Response {
  const url = urlLang(lang, path);
	if (!url) {
		return new Response("Not Found", { status: 404 });
	}
  return redirect(url);
}

export function redirectLangFromRoute(
  routeArgs: LangRouteParam,
  path: string,
	init?: number|{headers: Record<string,string>} 
): Response {
  const url = urlLangFromRoute(routeArgs, path);
	if (!url) {
		return new Response("Not Found", { status: 404 });
	}
  return redirect(url, init);
}

export function redirectDefaultLang(
  path: string,
	init?: number|{headers: Record<string,string>} 
): Response {
  const url = urlDefaultLang(path);
  return redirect(url, init);
}

export function isAdminRoute(request: Request): boolean {
	const url = new URL(request.url);
	const segments = url.pathname.split('/').filter(s => s.length > 0);
	if (segments.length < 2){
		return false
	}
	return segments[1] === 'admin';
}
