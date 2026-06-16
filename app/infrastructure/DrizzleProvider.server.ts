/**
 * DrizzleProvider registers the already-initialised Drizzle `dr` singleton under a typed DRIZZLE_CLIENT injection token.
 *
 * WHY useFactory rather than useValue:
 *   This ensures that if `initDB()` has not been called before `NestFactory.createApplicationContext()`,
 *   the factory receives `undefined` and the failure surfaces immediately at context creation.
 */
import { type FactoryProvider, type InjectionToken } from "@nestjs/common";

import { type Dr, dr } from "~/db.server";

/**
 * Typed injection token for the Drizzle client singleton.
 *
 * All consumers MUST import this constant — never use a plain string "DRIZZLE_CLIENT"
 * at an injection site, as the typed token and a plain string are different provider
 * keys in NestJS.
 */
export const DRIZZLE_CLIENT: InjectionToken<Dr> = Symbol("DRIZZLE_CLIENT");

/**
 * NestJS provider descriptor that registers the Drizzle singleton under DRIZZLE_CLIENT.
 *
 * Typed as FactoryProvider<Dr> (not the broader Provider union) so that consumers and
 * tests can access .provide and .useFactory without TypeScript narrowing errors.
 */
export const DrizzleProvider: FactoryProvider<Dr> = {
	provide: DRIZZLE_CLIENT,
	useFactory: (): Dr => dr,
};
