import { isRouteErrorResponse, useRouteError } from "react-router";
import type { ErrorResponse } from "~/shared/errors/ErrorResponse";

// Shared ErrorBoundary for the notices list and detail routes (design.md Decision 4).
export function NoticeErrorBoundary() {
	const error = useRouteError();

	if (isRouteErrorResponse(error)) {
		const body = error.data as ErrorResponse | undefined;
		const message = body?.error?.message ?? "An unexpected error occurred.";
		const traceId = body?.error?.traceId;

		return (
			<div role="alert">
				<p>{message}</p>
				{traceId ? (
					<button
						type="button"
						onClick={() => navigator.clipboard?.writeText(traceId)}
					>
						{traceId}
					</button>
				) : null}
			</div>
		);
	}

	// Non-Response error: never render .message/.stack here (ADR-003 Rule 4).
	return (
		<div role="alert">
			<p>An unexpected error occurred. Please try again later.</p>
		</div>
	);
}
