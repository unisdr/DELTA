import type { ILogger } from "~/shared/logging/ILogger";
import type { INoticeRepository } from "~/domains/notices/application/ports/INoticeRepository";
import {
	toNoticeDto,
	type NoticeDto,
} from "~/domains/notices/application/dto/NoticeDto";
import { NotFoundError } from "~/shared/errors/DomainError";

/**
 * Input value object for GetNoticeByIdUseCase.
 */
export interface GetNoticeByIdQuery {
	id: string;
	tenantId: string;
}

/**
 * Thrown when a notice cannot be found for the given id + tenantId pair.
 *
 * WHY subclass NotFoundError rather than DomainError directly: `NotFoundError`
 * already carries `code = "NOT_FOUND"` and `statusHint = 404`.
 *
 * Collocated here rather than in a shared errors file (design.md Decision 5).
 * If a second use case needs this type, extract it to
 * `app/domains/notices/application/errors/NoticeErrors.ts` at that point.
 */
export class NoticeNotFoundError extends NotFoundError {
	constructor(id: string) {
		super("Notice", id);
	}
}

/**
 * Application use case: retrieve a single Notice by ID within a tenant.
 *
 * Tenant isolation is enforced at two levels:
 * 1. `INoticeRepository.findById(id, tenantId)` scopes the DB query to the tenant.
 * 2. This use case adds a defence-in-depth check on the returned entity's `tenantId`
 *    to guard against a misconfigured repository adapter.
 *
 * Non-`NotFoundError` failures (e.g. DB connection errors) propagate unmodified —
 * the composition root or framework-level handler is responsible for those.
 */
export class GetNoticeByIdUseCase {
	constructor(
		private readonly logger: ILogger,
		private readonly noticeRepository: INoticeRepository,
	) {}

	async execute(query: GetNoticeByIdQuery): Promise<NoticeDto> {
		let notice;

		try {
			notice = await this.noticeRepository.findById(query.id, query.tenantId);
		} catch (err) {
			// WHY re-throw as NoticeNotFoundError rather than propagating NotFoundError
			// unmodified: callers should not need to know which NotFoundError subclass
			// the repository uses. NoticeNotFoundError is the correct boundary type for
			// this use case. See design.md Decision 3.
			if (err instanceof NotFoundError) {
				throw new NoticeNotFoundError(query.id);
			}
			// Non-NotFoundError errors propagate unmodified per design.md Decision 4.
			throw err;
		}

		// Defence-in-depth tenant check: even though the repository receives tenantId
		// as an explicit parameter, this guard catches a misconfigured or future adapter
		// that fails to enforce tenant scoping.
		if (notice.tenantId !== query.tenantId) {
			throw new NoticeNotFoundError(query.id);
		}

		this.logger.info({
			msg: "notice.fetched",
			noticeId: notice.id,
			tenantId: notice.tenantId,
		});

		return toNoticeDto(notice);
	}
}
