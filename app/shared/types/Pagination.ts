/**
 * Pagination parameters for repository port methods.
 *
 * Lives in `app/shared/types/` rather than inline in any single repository
 * interface because every domain port that returns a list will need the same
 * shape — `INoticeRepository`, and future ports for users, organisations, and
 * events. A single canonical definition prevents divergence across ports.
 *
 * `page` is 1-based: the first page is page 1, not page 0.
 */
export interface Pagination {
	/** 1-based page number. The first page is 1. */
	page: number;
	/** Maximum number of items to return per page. */
	pageSize: number;
}
