import type { Audience, LocaleMap, Notice } from "~/domains/notices/domain/Notice";

/**
 * Serialisable representation of a Notice that can cross the application-to-
 * presentation boundary (HTTP response, session, etc.) without information loss.
 *
 * WHY dates are strings: `Date` objects are not JSON-serialisable — they silently
 * become strings in `JSON.stringify`, losing timezone context. Storing them as
 * ISO 8601 strings (TIMESTAMPTZ-safe) means the DTO is always safe to send over
 * the wire or store in session. Callers that need a `Date` object can parse.
 */
export interface NoticeDto {
	id: string;
	tenantId: string;
	titleJson: LocaleMap;
	bodyJson: LocaleMap | null;
	isPublished: boolean;
	/** ISO 8601 timestamp of first publication, or null when the notice is unpublished. */
	publishedAt: string | null;
	audience: Audience;
	/** ISO 8601 creation timestamp. */
	createdAt: string;
	/** ISO 8601 last-updated timestamp. */
	updatedAt: string;
}

/**
 * Pure mapper: converts a `Notice` entity into a `NoticeDto`.
 *
 * WHY standalone function, not a method on Notice: entities in Clean Architecture
 * must not know about DTO shapes — DTOs are an application-layer concern. Keeping
 * this function here prevents the domain layer from depending on the application
 * layer, preserving the dependency direction (domain ← application).
 */
export function toNoticeDto(notice: Notice): NoticeDto {
	return {
		id: notice.id,
		tenantId: notice.tenantId,
		titleJson: notice.titleJson,
		bodyJson: notice.bodyJson,
		isPublished: notice.isPublished,
		publishedAt: notice.publishedAt?.toISOString() ?? null,
		audience: notice.audience,
		createdAt: notice.createdAt.toISOString(),
		updatedAt: notice.updatedAt.toISOString(),
	};
}
