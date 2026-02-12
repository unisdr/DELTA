import { relations } from "drizzle-orm";
import { pgTable, uuid, AnyPgColumn } from "drizzle-orm/pg-core";
import {
	ourRandomUUID,
	zeroStrMap,
	ourBigint,
	createdUpdatedTimestamps,
} from "../../utils/drizzleUtil";

/////////////////////////////////////////////////////////
// Table for generic classification categories

export const categoriesTable = pgTable("categories", {
	id: ourRandomUUID(),
	name: zeroStrMap("name"),
	parentId: uuid("parent_id").references((): AnyPgColumn => categoriesTable.id),
	level: ourBigint("level").notNull().default(1),
	...createdUpdatedTimestamps,
});
export type SelectCategories = typeof categoriesTable.$inferSelect;

export const categoryCategoryParent_Rel = relations(categoriesTable, ({ one }) => ({
	categoryParent: one(categoriesTable, {
		fields: [categoriesTable.parentId],
		references: [categoriesTable.id],
	}),
}));
