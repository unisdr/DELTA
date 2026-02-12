import { customType } from "drizzle-orm/pg-core";

export function urlLang(lang: string, path: string): string {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return `/${lang}${normalizedPath}`;
}
// // Declared the migrations table to avoid removal after drizzle db syncronization.
// export const drizzleMigrations = pgTable("__drizzle_migrations__", {
// 	id: serial().primaryKey().notNull(),
// 	hash: text().notNull(),
// 	createdAt: bigint("created_at", { mode: "number" }),
// });
// Custom URL type with regex constraint
export const url = customType<{
	data: string;
	driver: "string";
}>({
	dataType() {
		return "varchar";
	},
	toDriver(value: string): string {
		// Validate URL format
		const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
		if (!urlRegex.test(value)) {
			throw new Error("Invalid URL format");
		}
		return value;
	},
});
