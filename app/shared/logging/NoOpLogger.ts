/**
 * NoOpLogger — canonical test double that silently satisfies ILogger (ADR-004).
 *
 * WHY: Use cases under test receive a logger via constructor injection. Tests
 * must not pull in Pino, write to stdout, or suppress console noise with
 * fragile mocking. NoOpLogger is a zero-dependency, zero-side-effect stand-in:
 * every method silently accepts the call and discards it. This keeps unit tests
 * fast and isolated from infrastructure concerns.
 *
 * In production, the Pino adapter (a future infrastructure concern) is injected
 * at the composition root — NoOpLogger never appears there.
 */
import type { ILogger } from "./ILogger";

export class NoOpLogger implements ILogger {
	info(_data: Record<string, unknown>): void {}
	warn(_data: Record<string, unknown>): void {}
	error(_data: Record<string, unknown>): void {}
	debug(_data: Record<string, unknown>): void {}
}
