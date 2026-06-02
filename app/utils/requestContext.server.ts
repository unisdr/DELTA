/**
 * Per-request async context store backed by Node.js AsyncLocalStorage.
 *
 * WHY this exists:
 *   `getUserFromSession()` performs a full DB round-trip on every call. In a
 *   React Router v7 app, parallel route loaders can trigger multiple session
 *   reads within a single request. This module provides an isolated, mutable
 *   store for each request so that repeated lookups within the same request
 *   lifecycle can be short-circuited after the first real DB call.
 *
 * Extension point (ADR-004):
 *   The store type `RequestContextStore` is intentionally minimal at this stage.
 *   ADR-004 (structured request logging) will add a `traceId` field to this
 *   same store without requiring changes to any of the existing consumers.
 */

import { AsyncLocalStorage } from "node:async_hooks";
// Type-only import — erased at compile time, so no runtime circular dependency
// between this module and session.ts (which will import getRequestContext at runtime).
import type { UserSession } from "~/utils/session";

export type RequestContextStore = {
	/**
	 * Resolved result of getUserFromSession().
	 *
	 * Three-state semantics:
	 *   - `undefined`   — lookup not yet performed for this request
	 *   - `null`        — lookup performed; no valid session (unauthenticated / timed out)
	 *   - `UserSession` — lookup performed; valid authenticated session found
	 *
	 * The three-state design ensures exactly one DB call per request regardless
	 * of session validity — including the common unauthenticated case.
	 */
	sessionCache: UserSession | null | undefined;

	/**
	 * In-flight DB lookup promise, stored before `findFirst` is called.
	 *
	 * Parallel route loaders may call `getUserFromSession` concurrently before
	 * the first lookup resolves. When this field is set, subsequent callers
	 * await this promise instead of issuing their own DB query. Cleared to
	 * `undefined` once the promise settles and `sessionCache` is populated.
	 */
	sessionCachePromise: Promise<UserSession | null> | undefined;
};

// Module-private singleton — one ALS instance for the entire process lifetime.
// Each withRequestContext() call creates a fresh child store via als.run(),
// so concurrent and sequential requests never share store state.
const als = new AsyncLocalStorage<RequestContextStore>();

/**
 * Wraps `fn` in a fresh, isolated request context store and returns the
 * promise `fn` resolves to.
 *
 * Uses `als.run()` (NOT `als.enterWith()`) to guarantee that each call
 * produces its own isolated store. `enterWith` would mutate the current
 * async context in-place, allowing state to bleed between requests/tests.
 */
export function withRequestContext<T>(fn: () => Promise<T>): Promise<T> {
	return als.run({ sessionCache: undefined, sessionCachePromise: undefined }, fn);
}

/**
 * Returns the live, mutable `RequestContextStore` for the current async
 * context, or `undefined` if no `withRequestContext()` scope is active.
 *
 * Callers may read and write fields on the returned object directly — the
 * store is shared by reference within the same async chain.
 */
export function getRequestContext(): RequestContextStore | undefined {
	return als.getStore();
}
