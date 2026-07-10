import "../../../db/setup";
import "reflect-metadata";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";

import { NoticesModule } from "~/domains/notices/infrastructure/NoticesModule.server";
import { dr } from "~/db.server";
import { noticesTable } from "~/drizzle/schema/noticesTable";
import { countriesTable } from "../../../db/testSchema/countriesTable";
import { countryAccounts } from "../../../db/testSchema/countryAccounts";
import type { ErrorResponse } from "~/shared/errors/ErrorResponse";
import {
	withRequestContext,
	getRequestContext,
} from "~/utils/requestContext.server";

let testingModule: TestingModule;

vi.mock("~/init.server", () => ({
	getAppContext: () => ({
		get: (token: Parameters<TestingModule["get"]>[0]) =>
			testingModule.get(token),
	}),
}));

vi.mock("~/utils/session", async (importOriginal) => {
	const original = await importOriginal<Record<string, unknown>>();
	return { ...original, getCountryAccountsIdFromSession: vi.fn() };
});

import { getCountryAccountsIdFromSession } from "~/utils/session";
import { loader } from "~/routes/$lang+/_authenticated+/notices+/_index";

const mockGetCountryAccountsIdFromSession = vi.mocked(
	getCountryAccountsIdFromSession,
);

async function insertCountryAccount(): Promise<string> {
	const [country] = await dr
		.insert(countriesTable)
		.values({ name: `Test Country ${crypto.randomUUID().slice(0, 8)}` })
		.returning({ id: countriesTable.id });
	const [account] = await dr
		.insert(countryAccounts)
		.values({ shortDescription: "TST", countryId: country.id })
		.returning({ id: countryAccounts.id });
	return account.id;
}

function makeArgs(url: string, tenantIdForSession: string | null) {
	mockGetCountryAccountsIdFromSession.mockResolvedValue(
		tenantIdForSession ?? undefined,
	);
	const request = new Request(url);
	// Cast needed: the loader ignores `context`, so a real AppLoadContext is unnecessary here.
	return {
		request,
		params: { lang: "en" },
		context: {},
	} as unknown as Parameters<typeof loader>[0];
}

describe("Notices list route loader", () => {
	let tenantId: string;

	beforeEach(async () => {
		testingModule = await Test.createTestingModule({
			imports: [NoticesModule],
		}).compile();

		mockGetCountryAccountsIdFromSession.mockReset();
		tenantId = await insertCountryAccount();
	});

	afterEach(async () => {
		await testingModule.close();
	});

	it("defaults to page 1, pageSize 20 when no query params are supplied", async () => {
		const { ListNoticesUseCase } =
			await import("~/domains/notices/application/use-cases/ListNotices");
		const executeSpy = vi.spyOn(
			testingModule.get(ListNoticesUseCase),
			"execute",
		);

		await loader(makeArgs("http://localhost/en/notices", tenantId));

		expect(executeSpy).toHaveBeenCalledWith({
			tenantId,
			page: 1,
			pageSize: 20,
		});
		executeSpy.mockRestore();
	});

	it("forwards explicit valid page/pageSize query params as-is", async () => {
		const { ListNoticesUseCase } =
			await import("~/domains/notices/application/use-cases/ListNotices");
		const executeSpy = vi.spyOn(
			testingModule.get(ListNoticesUseCase),
			"execute",
		);

		await loader(
			makeArgs("http://localhost/en/notices?page=3&pageSize=50", tenantId),
		);

		expect(executeSpy).toHaveBeenCalledWith({
			tenantId,
			page: 3,
			pageSize: 50,
		});
		executeSpy.mockRestore();
	});

	it("falls back to defaults when page/pageSize are malformed", async () => {
		const { ListNoticesUseCase } =
			await import("~/domains/notices/application/use-cases/ListNotices");
		const executeSpy = vi.spyOn(
			testingModule.get(ListNoticesUseCase),
			"execute",
		);

		await loader(
			makeArgs("http://localhost/en/notices?page=abc&pageSize=xyz", tenantId),
		);

		expect(executeSpy).toHaveBeenCalledWith({
			tenantId,
			page: 1,
			pageSize: 20,
		});
		executeSpy.mockRestore();
	});

	it("clamps pageSize to a maximum of 100", async () => {
		const { ListNoticesUseCase } =
			await import("~/domains/notices/application/use-cases/ListNotices");
		const executeSpy = vi.spyOn(
			testingModule.get(ListNoticesUseCase),
			"execute",
		);

		await loader(
			makeArgs("http://localhost/en/notices?pageSize=500", tenantId),
		);

		expect(executeSpy).toHaveBeenCalledWith({
			tenantId,
			page: 1,
			pageSize: 100,
		});
		executeSpy.mockRestore();
	});

	it("returns the plain NoticeDto[] with no success wrapper", async () => {
		await dr.insert(noticesTable).values([
			{
				countryAccountsId: tenantId,
				titleJson: { en: "Notice A" },
				isPublished: true,
				audience: "all",
			},
			{
				countryAccountsId: tenantId,
				titleJson: { en: "Notice B" },
				isPublished: false,
				audience: "all",
			},
		]);

		const result = await loader(
			makeArgs("http://localhost/en/notices", tenantId),
		);

		expect(Array.isArray(result)).toBe(true);
		expect(result).toHaveLength(2);
		expect(result).not.toHaveProperty("success");
	});

	it("throws a redirect to /{lang}/user/select-instance when no tenant can be resolved", async () => {
		let thrown: unknown;
		try {
			await loader(makeArgs("http://localhost/en/notices", null));
		} catch (err) {
			thrown = err;
		}

		expect(thrown).toBeInstanceOf(Response);
		const response = thrown as Response;
		expect(response.status).toBe(302);
		expect(response.headers.get("Location")).toBe("/en/user/select-instance");
	});

	it("uses getRequestContext().tenantId and skips the session fallback when context is active", async () => {
		const result = await withRequestContext(async () => {
			const ctx = getRequestContext();
			if (ctx) ctx.tenantId = tenantId;
			const request = new Request("http://localhost/en/notices");
			// Cast needed: the loader ignores `context`, so a real AppLoadContext is unnecessary here.
			return loader({
				request,
				params: { lang: "en" },
				context: {},
			} as unknown as Parameters<typeof loader>[0]);
		});

		expect(Array.isArray(result)).toBe(true);
		expect(mockGetCountryAccountsIdFromSession).not.toHaveBeenCalled();
	});

	it("throws the ADR-003 envelope with the correct status when the use case throws a DomainError", async () => {
		const { ListNoticesUseCase } =
			await import("~/domains/notices/application/use-cases/ListNotices");
		const { ValidationError } = await import("~/shared/errors/DomainError");
		const domainError = new ValidationError("bad query", { field: "page" });
		const executeSpy = vi
			.spyOn(testingModule.get(ListNoticesUseCase), "execute")
			.mockRejectedValueOnce(domainError);

		let thrown: unknown;
		try {
			await loader(makeArgs("http://localhost/en/notices", tenantId));
		} catch (err) {
			thrown = err;
		}

		expect(thrown).toBeInstanceOf(Response);
		const response = thrown as Response;
		expect(response.status).toBe(422);
		const body = (await response.json()) as ErrorResponse;
		expect(body.success).toBe(false);
		expect(body.error.code).toBe("VALIDATION_ERROR");
		expect(body.error.details).toEqual({ field: "page" });

		executeSpy.mockRestore();
	});

	it("logs and rethrows a non-DomainError failure unmodified", async () => {
		const { getPinoLogger } =
			await import("~/infrastructure/logging/PinoLogger.server");
		const errorSpy = vi.spyOn(getPinoLogger(), "error");

		const { ListNoticesUseCase } =
			await import("~/domains/notices/application/use-cases/ListNotices");
		const dbError = new Error("DB connection lost");
		const executeSpy = vi
			.spyOn(testingModule.get(ListNoticesUseCase), "execute")
			.mockRejectedValueOnce(dbError);

		let thrown: unknown;
		try {
			await loader(makeArgs("http://localhost/en/notices", tenantId));
		} catch (err) {
			thrown = err;
		}

		expect(thrown).toBe(dbError);
		expect(errorSpy).toHaveBeenCalledTimes(1);

		executeSpy.mockRestore();
		errorSpy.mockRestore();
	});
});
