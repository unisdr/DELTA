/**
 * Barrel export for app/shared/logging (ADR-004).
 *
 * WHY: Callers import from `~/shared/logging` rather than deep file paths so
 * internal reorganisation never breaks consumers. Named exports (no `export *`)
 * keep the public surface explicit and tree-shaking-friendly — matching the
 * pattern in app/shared/errors/index.ts.
 */
export type { ILogger } from "./ILogger";
export { NoOpLogger } from "./NoOpLogger";
