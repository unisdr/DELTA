import { LangRouteParam } from "./lang.backend";
import { redirect } from "react-router";

// Translation removed - language parameter no longer used
export function replaceLang(path: string, _lang: string): string {
	return path;
}

// Translation removed - always use path without language prefix
export function urlLangFromRoute(
	_routeArgs: LangRouteParam,
	path: string,
): string | null {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return normalizedPath;
}

// Translation removed - always use path without language prefix
export function urlLangFromRouteAllowDefault(
	_routeArgs: LangRouteParam,
	path: string,
): string {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return normalizedPath;
}

// Translation removed - always use path without language prefix
export function urlDefaultLang(path: string): string {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return normalizedPath;
}

// Translation removed - redirect without language prefix
export function redirectLang(_lang: string, path: string): Response {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return redirect(normalizedPath);
}

// Translation removed - redirect without language prefix
export function redirectLangFromRoute(
	_routeArgs: LangRouteParam,
	path: string,
	init?: number | { headers: Record<string, string> },
): Response {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return redirect(normalizedPath, init);
}

// Translation removed - redirect without language prefix
export function redirectLangFromRouteAllowDefault(
	_routeArgs: LangRouteParam,
	path: string,
	init?: number | { headers: Record<string, string> },
): Response {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return redirect(normalizedPath, init);
}

// Translation removed - redirect without language prefix
export function redirectDefaultLang(
	path: string,
	init?: number | { headers: Record<string, string> },
): Response {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return redirect(normalizedPath, init);
}

export function isAdminRoute(request: Request): boolean {
	const url = new URL(request.url);
	const segments = url.pathname.split("/").filter((s) => s.length > 0);
	if (segments.length < 1) {
		return false;
	}
	return segments[0] === "admin";
}
