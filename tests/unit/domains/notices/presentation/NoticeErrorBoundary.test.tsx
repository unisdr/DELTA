import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import type { ErrorResponse } from "~/shared/errors/ErrorResponse";

let mockError: unknown;
let mockIsRouteErrorResponse: (error: unknown) => boolean;

vi.mock("react-router", () => ({
	useRouteError: () => mockError,
	isRouteErrorResponse: (error: unknown) => mockIsRouteErrorResponse(error),
}));

import { NoticeErrorBoundary } from "~/domains/notices/presentation/NoticeErrorBoundary";

function makeResponseError(body: ErrorResponse) {
	return { data: body };
}

describe("NoticeErrorBoundary", () => {
	it("renders the message and a copyable traceId for a thrown Response envelope", () => {
		mockIsRouteErrorResponse = () => true;
		mockError = makeResponseError({
			success: false,
			error: {
				code: "NOT_FOUND",
				message: "Notice not found",
				traceId: "trace-1",
				timestamp: "2026-07-02T00:00:00.000Z",
			},
		});

		const html = renderToString(<NoticeErrorBoundary />);

		expect(html).toContain("Notice not found");
		expect(html).toContain("trace-1");
	});

	it("does not crash and still shows error.message when details is present", () => {
		mockIsRouteErrorResponse = () => true;
		mockError = makeResponseError({
			success: false,
			error: {
				code: "VALIDATION_ERROR",
				message: "Invalid request",
				details: { entity: "Notice", id: "abc" },
				traceId: "trace-2",
				timestamp: "2026-07-02T00:00:00.000Z",
			},
		});

		const html = renderToString(<NoticeErrorBoundary />);

		expect(html).toContain("Invalid request");
		expect(html).not.toContain("[object Object]");
	});

	it("renders a generic fallback and never leaks .message/.stack for a plain Error", () => {
		mockIsRouteErrorResponse = () => false;
		mockError = new Error("Internal secret stack detail");

		const html = renderToString(<NoticeErrorBoundary />);

		expect(html).not.toContain("Internal secret stack detail");
		expect(html).toContain("unexpected error");
	});

	it("does not render a blank or 'undefined' traceId for a plain Error", () => {
		mockIsRouteErrorResponse = () => false;
		mockError = new Error("boom");

		const html = renderToString(<NoticeErrorBoundary />);

		expect(html).not.toContain("undefined");
	});
});
