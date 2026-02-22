import { pgTable, varchar } from "drizzle-orm/pg-core";
import { ourRandomUUID } from "../../utils/drizzleUtil";

////////////////////////////////////////////////////////////////

export const superAdminUsersTable = pgTable("super_admin_users", {
	id: ourRandomUUID(),
	firstName: varchar("first_name", { length: 150 }),
	lastName: varchar("last_name", { length: 150 }),
	email: varchar("email", { length: 254 }).notNull().unique(),
	password: varchar("password", { length: 100 }).notNull(),
});

export type SelectSuperAdmins = typeof superAdminUsersTable.$inferSelect;
export type InsertSuperAdmins = typeof superAdminUsersTable.$inferInsert;
