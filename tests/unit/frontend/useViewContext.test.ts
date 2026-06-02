import { describe, it, expect, vi, beforeEach } from "vitest";
import { TranslationGetter } from "~/utils/translator";

// Stub globalThis.createTranslationGetter before importing the hook,
// because the hook calls this global unconditionally during its execution.
// The stub returns a TranslationGetter that echoes back the params so
// createTranslator has a valid function to call.
const stubTranslationGetter: TranslationGetter = (params) => ({
	msg: params.msg ?? params.code,
});

vi.stubGlobal(
	"createTranslationGetter",
	(_lang: string) => stubTranslationGetter,
);

// Mock react-router so useRouteLoaderData can be controlled per test
// without needing a real React Router context or rendering lifecycle.
vi.mock("react-router", () => ({
	useRouteLoaderData: vi.fn(),
}));

import { useRouteLoaderData } from "react-router";
import { useViewContext } from "~/frontend/context";

const mockUseRouteLoaderData = vi.mocked(useRouteLoaderData);

beforeEach(() => {
	vi.clearAllMocks();
});

describe("useViewContext", () => {
	describe("Happy path — lang and user present", () => {
		it("returns correct { t, lang, user, url } shape", () => {
			mockUseRouteLoaderData.mockReturnValue({
				common: { lang: "en", user: { id: "u1" } },
			});

			const result = useViewContext();

			expect(result.lang).toBe("en");
			expect(result.user).toEqual({ id: "u1" });
			expect(typeof result.t).toBe("function");
			expect(typeof result.url).toBe("function");
			// url must prepend the lang segment to the path
			expect(result.url("/foo")).toBe("/en/foo");
		});
	});

	describe("Happy path — user is null (unauthenticated)", () => {
		it("returns with user: null", () => {
			mockUseRouteLoaderData.mockReturnValue({
				common: { lang: "fr", user: null },
			});

			const result = useViewContext();

			expect(result.lang).toBe("fr");
			expect(result.user).toBeNull();
			expect(typeof result.t).toBe("function");
		});
	});

	describe("Error path — lang is missing or empty", () => {
		it("throws an Error whose message contains 'lang' when lang is empty string", () => {
			mockUseRouteLoaderData.mockReturnValue({
				common: { lang: "", user: null },
			});

			expect(() => useViewContext()).toThrow(
				expect.objectContaining({ message: expect.stringContaining("lang") }),
			);
		});
	});

	describe("Error path — root loader data is undefined", () => {
		it("throws when useRouteLoaderData returns undefined", () => {
			mockUseRouteLoaderData.mockReturnValue(undefined);

			// When rootData is undefined, accessing rootData.common will throw.
			// The hook must not silently return undefined fields.
			expect(() => useViewContext()).toThrow();
		});
	});
});
