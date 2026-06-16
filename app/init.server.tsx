// reflect-metadata must be imported before any NestJS module is evaluated so that
// the Reflect polyfill is available in environments where entry.server.tsx has not
// been loaded first (e.g. integration test runners).
import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { type INestApplicationContext } from "@nestjs/common";

import { initDB, endDB } from "./db.server";
import { initCookieStorage } from "./utils/session";
import { createTranslationGetter } from "~/backend.server/translations";
import { importTranslationsIfNeeded } from "./backend.server/services/translationDBUpdates/update";
import type {} from "~/types/createTranslationGetter.d";
import { CoreModule } from "~/infrastructure/CoreModule.server";

// The NestJS application context created by initServer().
let appContext: INestApplicationContext | undefined;

// In-flight bootstrap Promise stored before it is awaited so that concurrent calls to initServer() 
// (e.g. two parallel requests on a cold start) share the same Promise and do not create two separate DI containers.
let bootstrapPromise: Promise<INestApplicationContext> | undefined;

/**
 * Bootstrap the server: initialise the database, then create the NestJS application context (DI container only — no HTTP server).
 *
 * Ordering matters: initDB() assigns the `dr` singleton before NestFactory is called, DrizzleProvider factory reads `dr` at provider-resolution time.
 * Fire-and-forget from entry.server.tsx: React Router's entry point cannot use top-level await. The bootstrap promise resolves before the first loader/action is dispatched. 
 * BootstrapPromise: storing the in-flight Promise before awaiting it means concurrent callers join the same bootstrap instead of creating a second DI container.
 */
export async function initServer() {
	console.log("init.serve.tsx:init");

	// Store the Promise before awaiting it so that concurrent callers share the same bootstrap Promise.
	// initDB() is inside the guard so it also runs only once.
	if (!bootstrapPromise) {
		console.log("Initing DB...");
		initDB();
		bootstrapPromise = NestFactory.createApplicationContext(CoreModule, {
			// Suppress NestJS startup banner — this is not an HTTP application.
			logger: false,
		});
	}
	try {
		appContext = await bootstrapPromise;
	} catch (err) {
		// Reset so a subsequent call can retry rather than re-awaiting a permanently
		// rejected Promise.
		bootstrapPromise = undefined;
		throw err;
	}

	console.log("Initing cookie storage...");
	initCookieStorage();

	console.log("Setting up translator...");
	globalThis.createTranslationGetter = createTranslationGetter;

	importTranslationsIfNeeded();
}

/**
 * Returns the bootstrapped NestJS application context.
 * Throwing here with a clear message surfaces the ordering problem immediately.
 *
 * Call sites must be inside async loaders or actions where initServer() has already
 * resolved before the first request is handled.
 */
export function getAppContext(): INestApplicationContext {
	if (!appContext) {
		throw new Error(
			"NestJS application context has not been initialised. Call initServer() first.",
		);
	}
	return appContext;
}

export function endServer() {
	console.log("init.serve.tsx:end");
	console.log("Ending DB...");
	endDB();
}
