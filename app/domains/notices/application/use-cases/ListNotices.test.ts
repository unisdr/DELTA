import { describe, it, expect, vi } from "vitest";
import { NoOpLogger } from "~/shared/logging/NoOpLogger";
import type { INoticeRepository } from "~/domains/notices/application/ports/INoticeRepository";
import { Notice as NoticeCls, type Notice } from "~/domains/notices/domain/Notice";
import { ListNoticesUseCase } from "./ListNotices";
import type { ListNoticesQuery } from "./ListNotices";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a test Notice entity via the domain factory.
 *
 * WHY Notice.create() rather than a plain object literal: the entity constructor
 * is private, so the factory is the only valid construction path. Using it here
 * ensures the test doubles share the same shape as real domain objects.
 */
function buildNotice(
	overrides: {
		id?: string;
		tenantId?: string;
		titleJson?: Record<string, string>;
		bodyJson?: Record<string, string> | null;
	} = {},
): Notice {
	const now = new Date("2024-01-15T10:00:00.000Z");
	return NoticeCls.create({
		id: overrides.id ?? crypto.randomUUID(),
		tenantId: overrides.tenantId ?? "t1",
		titleJson: overrides.titleJson ?? { en: "Test Notice" },
		bodyJson: overrides.bodyJson ?? null,
		isPublished: false,
		audience: "private",
		publishedAt: null,
		createdAt: now,
		updatedAt: now,
	});
}

/**
 * Creates a typed INoticeRepository mock where all methods are stubbed.
 *
 * WHY vi.fn().mockResolvedValue for findAll: returning a real Promise ensures
 * concurrent execute() calls are genuinely in-flight simultaneously — a
 * synchronous stub would resolve before the second call starts and would not
 * exercise shared-state isolation.
 */
function makeRepository(
	findAllImpl?: (tenantId: string) => Promise<Notice[]>,
): INoticeRepository {
	return {
		findAll: findAllImpl
			? vi.fn().mockImplementation(findAllImpl)
			: vi.fn().mockResolvedValue([]),
		findById: vi.fn(),
		save: vi.fn(),
		delete: vi.fn(),
	};
}

/** Minimal valid query. Overrides can be provided per test. */
function buildQuery(
	overrides: Partial<ListNoticesQuery> = {},
): ListNoticesQuery {
	return {
		tenantId: "t1",
		page: 1,
		pageSize: 10,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ListNoticesUseCase", () => {
	// -------------------------------------------------------------------------
	// Happy path — non-empty list
	// -------------------------------------------------------------------------

	it("returns a NoticeDto[] for each Notice returned by the repository", async () => {
		const notice1 = buildNotice({
			id: "id-1",
			tenantId: "t1",
			titleJson: { en: "Notice One" },
		});
		const notice2 = buildNotice({
			id: "id-2",
			tenantId: "t1",
			titleJson: { en: "Notice Two" },
		});
		const repo = makeRepository(() => Promise.resolve([notice1, notice2]));
		const useCase = new ListNoticesUseCase(new NoOpLogger(), repo);

		const result = await useCase.execute(buildQuery());

		expect(result).toHaveLength(2);
		expect(result[0].id).toBe("id-1");
		expect(result[0].tenantId).toBe("t1");
		expect(result[0].titleJson).toEqual({ en: "Notice One" });
		expect(new Date(result[0].createdAt).toISOString()).toBe(
			result[0].createdAt,
		);
		expect(result[1].id).toBe("id-2");
		expect(result[1].tenantId).toBe("t1");
		expect(result[1].titleJson).toEqual({ en: "Notice Two" });
	});

	// -------------------------------------------------------------------------
	// Happy path — empty list
	// -------------------------------------------------------------------------

	it("returns an empty array when the repository returns no notices", async () => {
		const repo = makeRepository(() => Promise.resolve([]));
		const useCase = new ListNoticesUseCase(new NoOpLogger(), repo);

		const result = await useCase.execute(buildQuery());

		expect(result).toEqual([]);
	});

	// -------------------------------------------------------------------------
	// Pagination forwarding
	// -------------------------------------------------------------------------

	it("passes tenantId and pagination to findAll exactly once", async () => {
		const repo = makeRepository();
		const useCase = new ListNoticesUseCase(new NoOpLogger(), repo);

		await useCase.execute({ tenantId: "t1", page: 2, pageSize: 10 });

		expect(repo.findAll).toHaveBeenCalledOnce();
		expect(repo.findAll).toHaveBeenCalledWith("t1", { page: 2, pageSize: 10 });
	});

	// -------------------------------------------------------------------------
	// LocaleMap preservation — multi-locale
	// -------------------------------------------------------------------------

	it("preserves full LocaleMap in each NoticeDto (does not strip locale keys)", async () => {
		const notice = buildNotice({ titleJson: { en: "Title", fr: "Titre" } });
		const repo = makeRepository(() => Promise.resolve([notice]));
		const useCase = new ListNoticesUseCase(new NoOpLogger(), repo);

		const result = await useCase.execute(buildQuery());

		expect(result[0].titleJson).toEqual({ en: "Title", fr: "Titre" });
	});

	// -------------------------------------------------------------------------
	// LocaleMap preservation — single locale
	// -------------------------------------------------------------------------

	it("preserves a single-locale LocaleMap unchanged", async () => {
		const notice = buildNotice({ titleJson: { en: "English Only" } });
		const repo = makeRepository(() => Promise.resolve([notice]));
		const useCase = new ListNoticesUseCase(new NoOpLogger(), repo);

		const result = await useCase.execute(buildQuery());

		expect(result).toHaveLength(1);
		expect(result[0].titleJson).toEqual({ en: "English Only" });
	});

	// -------------------------------------------------------------------------
	// Logger — success with two notices
	// -------------------------------------------------------------------------

	it("emits logger.info with msg, tenantId, and count on success", async () => {
		const logger = new NoOpLogger();
		const infoSpy = vi.spyOn(logger, "info");
		const notice1 = buildNotice({ tenantId: "t1" });
		const notice2 = buildNotice({ tenantId: "t1" });
		const repo = makeRepository(() => Promise.resolve([notice1, notice2]));
		const useCase = new ListNoticesUseCase(logger, repo);

		await useCase.execute(buildQuery({ tenantId: "t1" }));

		expect(infoSpy).toHaveBeenCalledOnce();
		const record = infoSpy.mock.calls[0][0];
		expect(record).toMatchObject({
			msg: "notices.listed",
			tenantId: "t1",
			count: 2,
		});
	});

	// -------------------------------------------------------------------------
	// Logger — success with zero notices
	// -------------------------------------------------------------------------

	it("emits logger.info with count: 0 for empty result", async () => {
		const logger = new NoOpLogger();
		const infoSpy = vi.spyOn(logger, "info");
		const repo = makeRepository(() => Promise.resolve([]));
		const useCase = new ListNoticesUseCase(logger, repo);

		await useCase.execute(buildQuery({ tenantId: "t1" }));

		expect(infoSpy).toHaveBeenCalledOnce();
		const record = infoSpy.mock.calls[0][0];
		expect(record).toMatchObject({
			msg: "notices.listed",
			tenantId: "t1",
			count: 0,
		});
	});

	// -------------------------------------------------------------------------
	// Error propagation
	// -------------------------------------------------------------------------

	it("propagates repository errors unmodified", async () => {
		const logger = new NoOpLogger();
		const infoSpy = vi.spyOn(logger, "info");
		const dbError = new Error("DB connection lost");
		const repo = makeRepository(() => Promise.reject(dbError));
		const useCase = new ListNoticesUseCase(logger, repo);

		await expect(useCase.execute(buildQuery())).rejects.toBe(dbError);
		expect(infoSpy).not.toHaveBeenCalled();
	});

	// -------------------------------------------------------------------------
	// Concurrency — two independent callers
	// -------------------------------------------------------------------------

	it("two concurrent executions are independent", async () => {
		const noticeA = buildNotice({
			id: "a-1",
			tenantId: "tenant-A",
			titleJson: { en: "A Notice" },
		});
		const noticeB = buildNotice({
			id: "b-1",
			tenantId: "tenant-B",
			titleJson: { en: "B Notice" },
		});

		const repo = makeRepository((tenantId: string) =>
			Promise.resolve(tenantId === "tenant-A" ? [noticeA] : [noticeB]),
		);
		const useCase = new ListNoticesUseCase(new NoOpLogger(), repo);

		const [resultA, resultB] = await Promise.all([
			useCase.execute({ tenantId: "tenant-A", page: 1, pageSize: 10 }),
			useCase.execute({ tenantId: "tenant-B", page: 1, pageSize: 10 }),
		]);

		expect(repo.findAll).toHaveBeenCalledTimes(2);
		expect(resultA).toHaveLength(1);
		expect(resultA[0].tenantId).toBe("tenant-A");
		expect(resultB).toHaveLength(1);
		expect(resultB[0].tenantId).toBe("tenant-B");
	});
});
