/**
 * ILogger — port interface for structured logging (ADR-004).
 *
 * WHY: Application-layer use cases must emit structured log events without
 * coupling to any concrete logging framework (Pino, Winston, console wrappers).
 * Depending on this interface instead of a concrete implementation satisfies
 * the Dependency Inversion Principle: the use case owns the abstraction and
 * the infrastructure layer provides the adapter.
 *
 * All four methods accept a `Record<string, unknown>` data object — never a raw
 * string — so every log emission is machine-readable and filterable. A `msg`
 * field belongs inside the record, not as a leading string argument.
 */
export interface ILogger {
	info(data: Record<string, unknown>): void;
	warn(data: Record<string, unknown>): void;
	error(data: Record<string, unknown>): void;
	debug(data: Record<string, unknown>): void;
}
