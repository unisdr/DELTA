/**
 * Abstract base for all operational domain errors in DELTA.
 *
 * ADR-003 distinguishes two error categories:
 *  - Operational errors (subclasses of this class): anticipated runtime
 *    conditions that the system knows how to handle — entity not found,
 *    validation failure, insufficient permission, resource conflict.
 *  - Programmer errors (standard `Error`): unexpected bugs that should
 *    never be caught by application code.
 *
 * Subclasses MUST declare concrete `code` (machine-readable string) and
 * `statusHint` (HTTP status hint for the presentation layer). The base
 * constructor sets `this.name` to the runtime class name so that error
 * logs identify the concrete type rather than the generic "Error".
 *
 * @see ADR-003 — Shared error vocabulary for the Clean Architecture domain layer
 */
export abstract class DomainError extends Error {
	abstract readonly code: string;
	abstract readonly statusHint: number;
	readonly context: Record<string, unknown> | undefined;

	constructor(message: string, context?: Record<string, unknown>) {
		super(message);
		this.name = this.constructor.name;
		this.context = context;
	}
}

export class NotFoundError extends DomainError {
	readonly code = "NOT_FOUND";
	readonly statusHint = 404;

	constructor(entity: string, id: string) {
		super(`${entity} not found`, { entity, id });
	}
}

export class ValidationError extends DomainError {
	readonly code = "VALIDATION_ERROR";
	readonly statusHint = 422;
}

export class AuthorizationError extends DomainError {
	readonly code = "FORBIDDEN";
	readonly statusHint = 403;
}

export class ConflictError extends DomainError {
	readonly code = "CONFLICT";
	readonly statusHint = 409;
}
