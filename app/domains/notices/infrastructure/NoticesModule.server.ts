/**
 * NoticesModule — NestJS module that wires the Notices domain providers.
 *
 * WHY `.server.ts` suffix (Decision 1b in design.md):
 *   React Router v7's bundler excludes any file ending in `.server.ts` from the client bundle. 
 *
 * WHY DrizzleProvider is declared here rather than importing CoreModule (Decision 2):
 *   to avoid a circular NestJS module dependency (CoreModule → NoticesModule → CoreModule)
 *
 * WHY NOTICE_REPOSITORY is NOT exported from this module:
 *   Callers must depend on the use case interface, not on the repository adapter directly.
 */
import { Module } from "@nestjs/common";

import { DrizzleProvider } from "~/infrastructure/DrizzleProvider.server";
import { getPinoLogger } from "~/infrastructure/logging/PinoLogger.server";
import { CreateNoticeUseCase } from "~/domains/notices/application/use-cases/CreateNotice";
import { ListNoticesUseCase } from "~/domains/notices/application/use-cases/ListNotices";
import { GetNoticeByIdUseCase } from "~/domains/notices/application/use-cases/GetNoticeById";
import { DrizzleNoticeRepository } from "./DrizzleNoticeRepository.server";
import { NOTICE_REPOSITORY } from "./NoticeRepositoryToken";
import type { INoticeRepository } from "~/domains/notices/application/ports/INoticeRepository";

@Module({
	providers: [
		// DrizzleProvider registers DRIZZLE_CLIENT within this module's DI scope.
		// The factory returns the same global dr singleton — no new DB connection.
		DrizzleProvider,
		// Repository adapter registered under the typed NOTICE_REPOSITORY port token.
		// Consumers inject via the token, not via DrizzleNoticeRepository directly.
		{
			provide: NOTICE_REPOSITORY,
			useClass: DrizzleNoticeRepository,
		},
		// WHY useFactory for each use case (Decision 3 in design.md):
		//   Each use case constructs its logger via getPinoLogger()
		{
			provide: CreateNoticeUseCase,
			useFactory: (repo: INoticeRepository) =>
				new CreateNoticeUseCase(getPinoLogger(), repo),
			inject: [NOTICE_REPOSITORY],
		},
		{
			provide: ListNoticesUseCase,
			useFactory: (repo: INoticeRepository) =>
				new ListNoticesUseCase(getPinoLogger(), repo),
			inject: [NOTICE_REPOSITORY],
		},
		{
			provide: GetNoticeByIdUseCase,
			useFactory: (repo: INoticeRepository) =>
				new GetNoticeByIdUseCase(getPinoLogger(), repo),
			inject: [NOTICE_REPOSITORY],
		},
	],
	// Export the use cases so they are resolvable from consuming modules (e.g. CoreModule).
	// NOTICE_REPOSITORY is intentionally NOT exported — callers must use the use cases,
	// not bypass them by depending on the repository adapter directly.
	exports: [CreateNoticeUseCase, ListNoticesUseCase, GetNoticeByIdUseCase],
})
export class NoticesModule {}
