/**
 * CoreModule — root NestJS module for the Notices Pilot Clean Architecture migration
 *
 * WHY application context, not HTTP server:
 *   This module is bootstrapped exclusively via `NestFactory.createApplicationContext()`,
 *   The NestJS container is used purely for dependency injection.
 *
 * WHY a dedicated CoreModule rather than providing DrizzleProvider directly:
 *   Domain modules (e.g. NoticesModule) import CoreModule to gain access to DRIZZLE_CLIENT
 *   without directly declaring DrizzleProvider themselves. This follows NestJS module
 *   encapsulation — consumers depend on the module interface, not the concrete provider.
 */
import { Module } from "@nestjs/common";

import { DrizzleProvider } from "./DrizzleProvider.server";

@Module({
	providers: [DrizzleProvider],
	exports: [DrizzleProvider],
})
export class CoreModule {}
