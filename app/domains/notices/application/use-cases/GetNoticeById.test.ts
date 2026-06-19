import { describe, it, expect, vi } from "vitest";
import { NoOpLogger } from "~/shared/logging/NoOpLogger";
import type { INoticeRepository } from "~/domains/notices/application/ports/INoticeRepository";
import {
	Notice as NoticeCls,
	type Notice,
} from "~/domains/notices/domain/Notice";
import { NotFoundError } from "~/shared/errors/DomainError";
import { GetNoticeByIdUseCase, NoticeNotFoundError, type GetNoticeByIdQuery } from "./GetNoticeById";

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
		id: overrides.id ?? "abc",
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
 * WHY a plain object with vi.fn() stubs: we only need to control findById
 * in these tests; other methods are stubbed to satisfy the interface contract
 * without any real implementation.
 */
function makeRepository(
	findByIdImpl?: (id: string, tenantId: string) => Promise<Notice>,
): INoticeRepository {
	return {
		findAll: vi.fn().mockResolvedValue([]),
		findById: findByIdImpl ? vi.fn().mockImplementation(findByIdImpl) : vi.fn(),
		save: vi.fn(),
		delete: vi.fn(),
	};
}

/** Minimal valid query. Overrides can be provided per test. */
function buildQuery(
	overrides: Partial<GetNoticeByIdQuery> = {},
): GetNoticeByIdQuery {
	return {
		id: "abc",
		tenantId: "t1",
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GetNoticeByIdUseCase", () => {
	// -------------------------------------------------------------------------
	// Happy path
	// -------------------------------------------------------------------------

	it("returns a NoticeDto when the repository resolves with a matching notice", async () => {
		const notice = buildNotice({ id: "abc", tenantId: "t1" });
		const repo = makeRepository(() => Promise.resolve(notice));
		const useCase = new GetNoticeByIdUseCase(new NoOpLogger(), repo);

		const result = await useCase.execute(
			buildQuery({ id: "abc", tenantId: "t1" }),
		);

		expect(result.id).toBe("abc");
		expect(result.tenantId).toBe("t1");
		expect(result.titleJson).toEqual({ en: "Test Notice" });
		expect(new Date(result.createdAt).toISOString()).toBe(result.createdAt);
	});

	it("passes the correct id and tenantId to findById", async () => {
		const notice = buildNotice({ id: "abc", tenantId: "t1" });
		const repo = makeRepository(() => Promise.resolve(notice));
		const useCase = new GetNoticeByIdUseCase(new NoOpLogger(), repo);

		await useCase.execute(buildQuery({ id: "abc", tenantId: "t1" }));

		expect(repo.findById).toHaveBeenCalledOnce();
		expect(repo.findById).toHaveBeenCalledWith("abc", "t1");
	});

	it("emits logger.info with msg, noticeId, and tenantId on success", async () => {
		const logger = new NoOpLogger();
		const infoSpy = vi.spyOn(logger, "info");
		const notice = buildNotice({ id: "abc", tenantId: "t1" });
		const repo = makeRepository(() => Promise.resolve(notice));
		const useCase = new GetNoticeByIdUseCase(logger, repo);

		await useCase.execute(buildQuery({ id: "abc", tenantId: "t1" }));

		expect(infoSpy).toHaveBeenCalledOnce();
		const record = infoSpy.mock.calls[0][0];
		expect(record).toMatchObject({
			msg: "notice.fetched",
			noticeId: "abc",
			tenantId: "t1",
		});
	});

	// -------------------------------------------------------------------------
	// Not found
	// -------------------------------------------------------------------------

	it("throws NoticeNotFoundError when the repository throws NotFoundError", async () => {
		const repo = makeRepository(() =>
			Promise.reject(new NotFoundError("Notice", "missing")),
		);
		const useCase = new GetNoticeByIdUseCase(new NoOpLogger(), repo);

		await expect(
			useCase.execute(buildQuery({ id: "missing", tenantId: "t1" })),
		).rejects.toThrow(NoticeNotFoundError);
	});

	it("NoticeNotFoundError is instanceof NotFoundError", async () => {
		const repo = makeRepository(() =>
			Promise.reject(new NotFoundError("Notice", "missing")),
		);
		const useCase = new GetNoticeByIdUseCase(new NoOpLogger(), repo);

		await expect(
			useCase.execute(buildQuery({ id: "missing", tenantId: "t1" })),
		).rejects.toBeInstanceOf(NotFoundError);
	});

	it("does not call logger.info when the repository throws NotFoundError", async () => {
		const logger = new NoOpLogger();
		const infoSpy = vi.spyOn(logger, "info");
		const repo = makeRepository(() =>
			Promise.reject(new NotFoundError("Notice", "missing")),
		);
		const useCase = new GetNoticeByIdUseCase(logger, repo);

		await expect(
			useCase.execute(buildQuery({ id: "missing", tenantId: "t1" })),
		).rejects.toThrow(NoticeNotFoundError);

		expect(infoSpy).not.toHaveBeenCalled();
	});

	// -------------------------------------------------------------------------
	// Tenant isolation — defence-in-depth
	// -------------------------------------------------------------------------

	it("throws NoticeNotFoundError when the returned notice belongs to a different tenant", async () => {
		// WHY this test exists: the repository already scopes by tenantId, but the
		// use case adds a defence-in-depth check to guard against a misconfigured
		// adapter that fails to enforce tenant isolation.
		const notice = buildNotice({ id: "abc", tenantId: "t2" });
		const repo = makeRepository(() => Promise.resolve(notice));
		const useCase = new GetNoticeByIdUseCase(new NoOpLogger(), repo);

		await expect(
			useCase.execute(buildQuery({ id: "abc", tenantId: "t1" })),
		).rejects.toThrow(NoticeNotFoundError);
	});

	it("tenant-mismatch error is instanceof NotFoundError (prevents information leakage)", async () => {
		const notice = buildNotice({ id: "abc", tenantId: "t2" });
		const repo = makeRepository(() => Promise.resolve(notice));
		const useCase = new GetNoticeByIdUseCase(new NoOpLogger(), repo);

		await expect(
			useCase.execute(buildQuery({ id: "abc", tenantId: "t1" })),
		).rejects.toBeInstanceOf(NotFoundError);
	});

	it("does not call logger.info when tenant does not match", async () => {
		const logger = new NoOpLogger();
		const infoSpy = vi.spyOn(logger, "info");
		const notice = buildNotice({ id: "abc", tenantId: "t2" });
		const repo = makeRepository(() => Promise.resolve(notice));
		const useCase = new GetNoticeByIdUseCase(logger, repo);

		await expect(
			useCase.execute(buildQuery({ id: "abc", tenantId: "t1" })),
		).rejects.toThrow(NoticeNotFoundError);

		expect(infoSpy).not.toHaveBeenCalled();
	});

	// -------------------------------------------------------------------------
	// Error propagation — non-NotFoundError errors
	// -------------------------------------------------------------------------

	it("propagates non-NotFoundError errors unmodified", async () => {
		const dbError = new Error("DB unavailable");
		const repo = makeRepository(() => Promise.reject(dbError));
		const useCase = new GetNoticeByIdUseCase(new NoOpLogger(), repo);

		await expect(
			useCase.execute(buildQuery({ id: "abc", tenantId: "t1" })),
		).rejects.toBe(dbError);
	});

	it("does not call logger.info when an unexpected error is thrown", async () => {
		const logger = new NoOpLogger();
		const infoSpy = vi.spyOn(logger, "info");
		const dbError = new Error("DB unavailable");
		const repo = makeRepository(() => Promise.reject(dbError));
		const useCase = new GetNoticeByIdUseCase(logger, repo);

		await expect(useCase.execute(buildQuery())).rejects.toBe(dbError);

		expect(infoSpy).not.toHaveBeenCalled();
	});

	// -------------------------------------------------------------------------
	// Concurrency — two independent callers with different IDs
	// -------------------------------------------------------------------------

	it("two concurrent executions for different IDs are independent", async () => {
		const noticeA = buildNotice({
			id: "a",
			tenantId: "t1",
			titleJson: { en: "Notice A" },
		});
		const noticeB = buildNotice({
			id: "b",
			tenantId: "t1",
			titleJson: { en: "Notice B" },
		});

		const repo = makeRepository((id: string) =>
			Promise.resolve(id === "a" ? noticeA : noticeB),
		);
		const logger = new NoOpLogger();
		const infoSpy = vi.spyOn(logger, "info");
		const useCase = new GetNoticeByIdUseCase(logger, repo);

		const [resultA, resultB] = await Promise.all([
			useCase.execute(buildQuery({ id: "a", tenantId: "t1" })),
			useCase.execute(buildQuery({ id: "b", tenantId: "t1" })),
		]);

		expect(repo.findById).toHaveBeenCalledTimes(2);
		expect(resultA.id).toBe("a");
		expect(resultA.tenantId).toBe("t1");
		expect(resultB.id).toBe("b");
		expect(resultB.tenantId).toBe("t1");
		expect(infoSpy).toHaveBeenCalledTimes(2);
	});

	// -------------------------------------------------------------------------
	// Query shape — no locale field
	// -------------------------------------------------------------------------

	it("GetNoticeByIdQuery accepts only id and tenantId (no locale field)", () => {
		// WHY compile-time check: this test documents the spec decision (design.md
		// Decision 1) that locale resolution is the presentation layer's job.
		// The query shape is enforced at type level; this runtime test verifies
		// the object shape matches the expected contract.
		const query: GetNoticeByIdQuery = { id: "abc", tenantId: "t1" };
		expect(Object.keys(query)).toEqual(
			expect.arrayContaining(["id", "tenantId"]),
		);
		expect(Object.keys(query)).toHaveLength(2);
	});
});
