/**
 * Parses page/pageSize from a URL query string with safe defaults capped at 100.
 */
export function parsePagination(url: URL): { page: number; pageSize: number } {
	const page = Math.max(
		1,
		parseInt(url.searchParams.get("page") ?? "1", 10) || 1,
	);
	const pageSize = Math.min(
		100,
		Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20", 10) || 20),
	);
	return { page, pageSize };
}
