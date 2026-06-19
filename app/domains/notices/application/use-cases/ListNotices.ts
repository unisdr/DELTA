import type { ILogger } from "~/shared/logging/ILogger";
import type { INoticeRepository } from "~/domains/notices/application/ports/INoticeRepository";
import type { NoticeDto } from "~/domains/notices/application/dto/NoticeDto";
import { toNoticeDto } from "~/domains/notices/application/dto/NoticeDto";
import type { Pagination } from "~/shared/types";

/**
 * Input value object for ListNoticesUseCase.
 *
 * WHY no `locale` field: the use case does not transform any DTO field based on
 * locale — `toNoticeDto()` preserves the full `LocaleMap` and the presentation
 * layer (route loader, component) resolves a single locale string from the map
 * using the `$lang` URL segment it already holds.
 */
export interface ListNoticesQuery {
	tenantId: string;
	page: number;
	pageSize: number;
}

/**
 * Application use case: retrieve a paginated list of notices for a tenant.
 *
 * Keeping listing separate satisfies SRP — this class does exactly one thing:
 * orchestrate `INoticeRepository.findAll()`, map results via `toNoticeDto()`,
 * and emit a structured log event.
 *
 * Depends on:
 * - `INoticeRepository` (port interface, never a concrete adapter)
 * - `ILogger` (port interface, injected from the composition root)
 * - `toNoticeDto` (reused mapper from the dto module — no inline mapping)
 */
export class ListNoticesUseCase {
	constructor(
		private readonly logger: ILogger,
		private readonly noticeRepository: INoticeRepository,
	) {}

	async execute(query: ListNoticesQuery): Promise<NoticeDto[]> {
		const pagination: Pagination = {
			page: query.page,
			pageSize: query.pageSize,
		};

		const notices = await this.noticeRepository.findAll(
			query.tenantId,
			pagination,
		);

		const dtos = notices.map(toNoticeDto);

		this.logger.info({
			msg: "notices.listed",
			tenantId: query.tenantId,
			count: dtos.length,
		});

		return dtos;
	}
}
