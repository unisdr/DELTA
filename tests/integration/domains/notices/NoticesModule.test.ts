// PGlite mock MUST be the very first import so the vi.mock("~/db.server") is
// registered before any NestJS module factory runs and imports ~/db.server.
import "../../db/setup";
// reflect-metadata MUST be the second import — NestJS decorators require the
// Reflect polyfill to be in place before any decorated class is evaluated.
import "reflect-metadata";

import { Test, type TestingModule } from "@nestjs/testing";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { NoticesModule } from "~/domains/notices/infrastructure/NoticesModule.server";
import { NOTICE_REPOSITORY } from "~/domains/notices/infrastructure/NoticeRepositoryToken";
import { DrizzleNoticeRepository } from "~/domains/notices/infrastructure/DrizzleNoticeRepository.server";
import { CreateNoticeUseCase } from "~/domains/notices/application/use-cases/CreateNotice";
import { ListNoticesUseCase } from "~/domains/notices/application/use-cases/ListNotices";
import { GetNoticeByIdUseCase } from "~/domains/notices/application/use-cases/GetNoticeById";
import { CoreModule } from "~/infrastructure/CoreModule.server";
import { getPinoLogger } from "~/infrastructure/logging/PinoLogger.server";

describe("NoticesModule", () => {
	const modulesToClose: TestingModule[] = [];
	let module: TestingModule;

	beforeEach(async () => {
		module = await Test.createTestingModule({
			imports: [NoticesModule],
		}).compile();
		modulesToClose.push(module);
	});

	afterEach(async () => {
		await Promise.all(modulesToClose.map((m) => m.close()));
		modulesToClose.length = 0;
	});

	it("compiles without error", () => {
		// Verifies notices-module-wiring spec: NoticesModule compiles.
		expect(module).toBeDefined();
	});

	it("NOTICE_REPOSITORY resolves to an instance of DrizzleNoticeRepository", () => {
		// Verifies notices-module-wiring spec: Token resolves to the correct adapter.
		expect(module.get(NOTICE_REPOSITORY)).toBeInstanceOf(
			DrizzleNoticeRepository,
		);
	});

	it("NOTICE_REPOSITORY token resolves to the same singleton on repeated gets", () => {
		// Verifies notices-module-wiring spec: Token resolves to the same singleton.
		// NestJS default scope is Singleton, so two gets must return the exact same reference.
		expect(module.get(NOTICE_REPOSITORY)).toBe(module.get(NOTICE_REPOSITORY));
	});

	it("NOTICE_REPOSITORY is a symbol-based token", () => {
		// Verifies notices-module-wiring spec: Token identity — symbol not string.
		// A plain string token and a Symbol token are different provider keys in NestJS;
		// the Symbol prevents accidental injection via a string literal.
		expect(typeof NOTICE_REPOSITORY).toBe("symbol");
	});

	it("CreateNoticeUseCase resolves to a defined instance", () => {
		// Verifies notices-module-wiring spec: CreateNoticeUseCase resolves to a defined instance.
		expect(module.get(CreateNoticeUseCase)).toBeDefined();
	});

	it("ListNoticesUseCase resolves to a defined instance", () => {
		// Verifies notices-module-wiring spec: ListNoticesUseCase resolves to a defined instance.
		expect(module.get(ListNoticesUseCase)).toBeDefined();
	});

	it("GetNoticeByIdUseCase resolves to a defined instance", () => {
		// Verifies notices-module-wiring spec: GetNoticeByIdUseCase resolves to a defined instance.
		expect(module.get(GetNoticeByIdUseCase)).toBeDefined();
	});

	it("CreateNoticeUseCase's useFactory constructs its logger via getPinoLogger(), not NoOpLogger", () => {
		// Verifies notices-module-wiring spec: the factory-injected logger is the exact
		// singleton getPinoLogger() returns.
		const useCase = module.get(CreateNoticeUseCase) as unknown as {
			logger: unknown;
		};
		expect(useCase.logger).toBe(getPinoLogger());
	});

	it("ListNoticesUseCase's useFactory constructs its logger via getPinoLogger(), not NoOpLogger", () => {
		// Verifies notices-module-wiring spec: same identity check as above for ListNoticesUseCase.
		const useCase = module.get(ListNoticesUseCase) as unknown as {
			logger: unknown;
		};
		expect(useCase.logger).toBe(getPinoLogger());
	});

	it("GetNoticeByIdUseCase's useFactory constructs its logger via getPinoLogger(), not NoOpLogger", () => {
		// Verifies notices-module-wiring spec: same identity check as above for GetNoticeByIdUseCase.
		const useCase = module.get(GetNoticeByIdUseCase) as unknown as {
			logger: unknown;
		};
		expect(useCase.logger).toBe(getPinoLogger());
	});

	describe("concurrent compilation", () => {
		it("produces independent containers that do not share singleton instances", async () => {
			// Verifies notices-module-wiring spec: Concurrent compilation produces independent containers.
			// Each compile() creates an isolated NestJS DI container
			const [moduleA, moduleB] = await Promise.all([
				Test.createTestingModule({ imports: [NoticesModule] }).compile(),
				Test.createTestingModule({ imports: [NoticesModule] }).compile(),
			]);
			modulesToClose.push(moduleA, moduleB);

			// Both containers resolve all providers to defined values.
			expect(moduleA.get(CreateNoticeUseCase)).toBeDefined();
			expect(moduleA.get(ListNoticesUseCase)).toBeDefined();
			expect(moduleA.get(GetNoticeByIdUseCase)).toBeDefined();
			expect(moduleA.get(NOTICE_REPOSITORY)).toBeDefined();

			expect(moduleB.get(CreateNoticeUseCase)).toBeDefined();
			expect(moduleB.get(ListNoticesUseCase)).toBeDefined();
			expect(moduleB.get(GetNoticeByIdUseCase)).toBeDefined();
			expect(moduleB.get(NOTICE_REPOSITORY)).toBeDefined();

			// Each container's singleton instances are distinct objects — the two containers
			// are truly isolated and do not share provider instances across compile() calls.
			expect(moduleA.get(CreateNoticeUseCase)).not.toBe(
				moduleB.get(CreateNoticeUseCase),
			);
			expect(moduleA.get(ListNoticesUseCase)).not.toBe(
				moduleB.get(ListNoticesUseCase),
			);
			expect(moduleA.get(GetNoticeByIdUseCase)).not.toBe(
				moduleB.get(GetNoticeByIdUseCase),
			);
			expect(moduleA.get(NOTICE_REPOSITORY)).not.toBe(
				moduleB.get(NOTICE_REPOSITORY),
			);
		});
	});
});

describe("NoticesModule — CoreModule resolution", () => {
	const modulesToClose: TestingModule[] = [];

	afterEach(async () => {
		await Promise.all(modulesToClose.map((m) => m.close()));
		modulesToClose.length = 0;
	});

	it("CoreModule still compiles after importing NoticesModule", async () => {
		// Verifies core-module spec: CoreModule still compiles after importing NoticesModule.
		// Adding NoticesModule to CoreModule's imports must not break existing compilation.
		const module = await Test.createTestingModule({
			imports: [CoreModule],
		}).compile();
		modulesToClose.push(module);

		expect(module).toBeDefined();
	});

	it("CreateNoticeUseCase resolves from CoreModule context", async () => {
		// Verifies core-module spec: CreateNoticeUseCase resolves from CoreModule context.
		const module = await Test.createTestingModule({
			imports: [CoreModule],
		}).compile();
		modulesToClose.push(module);

		const useCase = module.get(CreateNoticeUseCase);
		expect(useCase).toBeDefined();
	});

	it("ListNoticesUseCase resolves from CoreModule context", async () => {
		// Verifies core-module spec: ListNoticesUseCase resolves from CoreModule context.
		const module = await Test.createTestingModule({
			imports: [CoreModule],
		}).compile();
		modulesToClose.push(module);

		const useCase = module.get(ListNoticesUseCase);
		expect(useCase).toBeDefined();
	});

	it("GetNoticeByIdUseCase resolves from CoreModule context", async () => {
		// Verifies core-module spec: GetNoticeByIdUseCase resolves from CoreModule context.
		const module = await Test.createTestingModule({
			imports: [CoreModule],
		}).compile();
		modulesToClose.push(module);

		const useCase = module.get(GetNoticeByIdUseCase);
		expect(useCase).toBeDefined();
	});
});
