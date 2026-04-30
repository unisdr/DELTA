import { afterAll, beforeAll, vi } from "vitest";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "~/drizzle/schema";
import { initCookieStorage } from "~/utils/session";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env.test") });

let pool: Pool | null = null;

let _dr: ReturnType<typeof drizzle<typeof schema>> | null = null;

vi.mock("~/db.server", async (importOriginal) => {
	const original = await importOriginal<any>();
	return {
		...original,
		get dr() {
			return _dr;
		},
	};
});

export { _dr as dr };

beforeAll(async () => {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error("DATABASE_URL not found in .env.test");
	}

	pool = new Pool({ connectionString: databaseUrl });
	_dr = drizzle(pool, { schema });

	globalThis.createTranslationGetter = (_lang: string) => {
		return (params: { code: string }) => ({ msg: params.code });
	};

	initCookieStorage();
});

afterAll(async () => {
	if (pool) {
		await pool.end();
	}
});
