import {
	pgTable,
	text,
	timestamp,
	integer,
	jsonb,
	uuid,
	unique,
} from "drizzle-orm/pg-core";
import {
	apiImportIdField,
	ourRandomUUID,
	ourBigint,
	zeroText,
} from "~/utils/drizzleUtil";
import { countryAccounts } from "./countryAccounts";

export const devExample1Table = pgTable(
	"dev_example1",
	{
		...apiImportIdField(),
		id: ourRandomUUID(),
		// for both required and optional text fields setting it to "" makes sense, it's different for numbers where 0 could be a valid entry
		field1: text("field1").notNull(),
		field2: text("field2").notNull(),
		// required
		field3: ourBigint("field3").notNull(),
		// optional
		field4: ourBigint("field4"),
		field6: text({ enum: ["one", "two", "three"] })
			.notNull()
			.default("one"),
		field7: timestamp("field7"),
		// yyyy or yyyy-mm or yyyy-mm-dd
		field8: zeroText("field8"),
		repeatableNum1: integer("repeatable_num1"),
		repeatableText1: text("repeatable_text1"),
		repeatableNum2: integer("repeatable_num2"),
		repeatableText2: text("repeatable_text2"),
		repeatableNum3: integer("repeatable_num3"),
		repeatableText3: text("repeatable_text3"),
		jsonData: jsonb("json_data"),
		countryAccountsId: uuid("country_accounts_id").references(
			() => countryAccounts.id,
			{
				onDelete: "cascade",
			},
		),
	},
	(table) => ({
		// Composite unique constraint for tenant-scoped api_import_id
		devExample1ApiImportIdTenantUnique: unique(
			"dev_example1_api_import_id_tenant_unique",
		).on(table.apiImportId, table.countryAccountsId),
	}),
);

export type SelectDevExample1 = typeof devExample1Table.$inferSelect;
export type InsertDevExample1 = typeof devExample1Table.$inferInsert;
