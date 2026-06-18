import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NoOpLogger } from "~/shared/logging/NoOpLogger";
import { ValidationError } from "~/shared/errors";
import type { INoticeRepository } from "~/domains/notices/application/ports/INoticeRepository";
import type { Notice } from "~/domains/notices/domain/Notice";
import { CreateNoticeUseCase } from "./CreateNotice";
import type { CreateNoticeCommand } from "./CreateNotice";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Builds a minimal valid command. Overrides can be provided for specific tests. */
function buildCommand(
	overrides: Partial<CreateNoticeCommand> = {},
): CreateNoticeCommand {
	return {
		tenantId: "tenant-1",
		titleJson: { en: "Test Notice" },
		bodyJson: null,
		isPublished: false,
		...overrides,
	};
}

/**
 * Creates a typed INoticeRepository mock with a `save` stub that resolves
 * with the notice passed to it. Using `vi.fn().mockResolvedValue` ensures the
 * stub returns a real Promise so both concurrent execute() calls are genuinely
 * in-flight simultaneously — a synchronous stub would resolve before the second
 * call starts and would not exercise shared-state isolation.
 */
function makeRepository(
	saveImpl?: (notice: Notice) => Promise<Notice>,
): INoticeRepository {
	return {
		save: saveImpl
			? vi.fn().mockImplementation(saveImpl)
			: vi.fn().mockImplementation((notice: Notice) => Promise.resolve(notice)),
		findById: vi.fn(),
		findAll: vi.fn(),
		delete: vi.fn(),
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CreateNoticeUseCase", () => {
	let logger: NoOpLogger;

	beforeEach(() => {
		logger = new NoOpLogger();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2024-01-15T10:00:00.000Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// -------------------------------------------------------------------------
	// Happy path — unpublished
	// -------------------------------------------------------------------------

	it("saves the notice and returns a NoticeDto for an unpublished notice", async () => {
		const repo = makeRepository();
		const useCase = new CreateNoticeUseCase(logger, repo);
		const command = buildCommand({ isPublished: false, bodyJson: null });

		const dto = await useCase.execute(command);

		expect(repo.save).toHaveBeenCalledOnce();
		const savedNotice = vi.mocked(repo.save).mock.calls[0][0];
		expect(savedNotice.tenantId).toBe(command.tenantId);
		expect(savedNotice.titleJson).toEqual(command.titleJson);
		expect(savedNotice.bodyJson).toBeNull();
		expect(savedNotice.isPublished).toBe(false);
		expect(savedNotice.publishedAt).toBeNull();
		expect(savedNotice.audience).toBe("private");

		expect(dto.id).toBeTruthy();
		expect(dto.isPublished).toBe(false);
		expect(dto.publishedAt).toBeNull();
		expect(new Date(dto.createdAt).toISOString()).toBe(dto.createdAt);
		expect(new Date(dto.updatedAt).toISOString()).toBe(dto.updatedAt);
	});

	// -------------------------------------------------------------------------
	// Happy path — published
	// -------------------------------------------------------------------------

	it("saves the notice and returns a NoticeDto for a published notice", async () => {
		const repo = makeRepository();
		const useCase = new CreateNoticeUseCase(logger, repo);
		const command = buildCommand({
			isPublished: true,
			titleJson: { en: "Published Notice" },
		});

		const dto = await useCase.execute(command);

		expect(repo.save).toHaveBeenCalledOnce();
		expect(dto.isPublished).toBe(true);
		expect(dto.publishedAt).not.toBeNull();
		// safe: not-null asserted by the expect() call above
		expect(new Date(dto.publishedAt!).toISOString()).toBe(dto.publishedAt);
	});

	// -------------------------------------------------------------------------
	// Logger receives an info event on success
	// -------------------------------------------------------------------------

	it("calls logger.info with the notice id after a successful save", async () => {
		const infoSpy = vi.spyOn(logger, "info");
		const repo = makeRepository();
		const useCase = new CreateNoticeUseCase(logger, repo);

		const dto = await useCase.execute(buildCommand());

		expect(infoSpy).toHaveBeenCalled();
		const logRecord = infoSpy.mock.calls[0][0];
		// The log record must identify the created notice
		expect(logRecord).toMatchObject({ noticeId: dto.id });
	});

	// -------------------------------------------------------------------------
	// ValidationError propagation — empty titleJson
	// -------------------------------------------------------------------------

	it("propagates ValidationError when titleJson is empty", async () => {
		const repo = makeRepository();
		const useCase = new CreateNoticeUseCase(logger, repo);
		const command = buildCommand({ titleJson: {} });

		await expect(useCase.execute(command)).rejects.toBeInstanceOf(
			ValidationError,
		);
		expect(repo.save).not.toHaveBeenCalled();
	});

	// -------------------------------------------------------------------------
	// ValidationError propagation — whitespace-only titleJson
	// -------------------------------------------------------------------------

	it("propagates ValidationError when titleJson contains only whitespace", async () => {
		const repo = makeRepository();
		const useCase = new CreateNoticeUseCase(logger, repo);
		const command = buildCommand({ titleJson: { en: "   " } });

		await expect(useCase.execute(command)).rejects.toBeInstanceOf(
			ValidationError,
		);
		expect(repo.save).not.toHaveBeenCalled();
	});

	// -------------------------------------------------------------------------
	// Repository error propagation
	// -------------------------------------------------------------------------

	it("propagates repository errors unmodified", async () => {
		const dbError = new Error("DB connection lost");
		const repo = makeRepository(() => Promise.reject(dbError));
		const useCase = new CreateNoticeUseCase(logger, repo);

		await expect(useCase.execute(buildCommand())).rejects.toBe(dbError);
	});

	// -------------------------------------------------------------------------
	// Concurrent executions produce distinct IDs
	// -------------------------------------------------------------------------

	it("produces distinct notice IDs for two concurrent executions", async () => {
		const repo = makeRepository();
		const useCase = new CreateNoticeUseCase(logger, repo);

		const [dto1, dto2] = await Promise.all([
			useCase.execute(buildCommand({ tenantId: "tenant-a" })),
			useCase.execute(buildCommand({ tenantId: "tenant-b" })),
		]);

		expect(dto1.id).toBeTruthy();
		expect(dto2.id).toBeTruthy();
		expect(dto1.id).not.toBe(dto2.id);
		expect(repo.save).toHaveBeenCalledTimes(2);
	});

	// -------------------------------------------------------------------------
	// toNoticeDto field mapping — published notice
	// -------------------------------------------------------------------------

	it("maps all NoticeDto fields correctly for a published notice", async () => {
		const frozenNow = new Date("2024-01-15T10:00:00.000Z");
		vi.setSystemTime(frozenNow);

		const repo = makeRepository();
		const useCase = new CreateNoticeUseCase(logger, repo);
		const command = buildCommand({
			isPublished: true,
			titleJson: { en: "My Notice", fr: "Mon Avis" },
			bodyJson: { en: "Body text" },
		});

		const dto = await useCase.execute(command);

		expect(dto.tenantId).toBe(command.tenantId);
		expect(dto.titleJson).toEqual(command.titleJson);
		expect(dto.bodyJson).toEqual(command.bodyJson);
		expect(dto.isPublished).toBe(true);
		expect(dto.audience).toBe("private");
		expect(dto.publishedAt).toBe(frozenNow.toISOString());
		expect(dto.createdAt).toBe(frozenNow.toISOString());
		expect(dto.updatedAt).toBe(frozenNow.toISOString());
	});

	// -------------------------------------------------------------------------
	// toNoticeDto field mapping — unpublished notice
	// -------------------------------------------------------------------------

	it("maps publishedAt as null in NoticeDto for an unpublished notice", async () => {
		const repo = makeRepository();
		const useCase = new CreateNoticeUseCase(logger, repo);

		const dto = await useCase.execute(buildCommand({ isPublished: false }));

		expect(dto.publishedAt).toBeNull();
	});
});
