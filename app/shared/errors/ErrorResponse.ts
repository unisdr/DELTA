/**
 * ADR-003 error envelope shape, thrown by presentation-layer loaders and 
 * parsed by the matching `ErrorBoundary`.
 *
 * Defined once and imported by both sides so a future field addition.
 */
export interface ErrorResponse {
	success: false;
	error: {
		code: string;
		message: string;
		details?: unknown;
		traceId: string;
		timestamp: string;
	};
}
