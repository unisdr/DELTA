import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

export const dtsSystemInfoTable = pgTable("dts_system_info", {
	id: uuid("id").primaryKey().notNull().default("73f0defb-4eba-4398-84b3-5e6737fec2b7"),
	versionNo: varchar("version_no", { length: 50 }).notNull(),
	installedAt: timestamp("installed_at"),
	updatedAt: timestamp("updated_at"),
	lastTranslationImportAt: timestamp("last_translation_import_at"),
});

export type SelectDtsSystemInfo = typeof dtsSystemInfoTable.$inferSelect;
export type InsertDtsSystemInfo = typeof dtsSystemInfoTable.$inferInsert;
