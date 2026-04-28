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
} from "../../utils/drizzleUtil";
import { countryAccountsTable } from "./countryAccountsTable";

export const devExample2Table = pgTable(
	"dev_example2",
	{
		...apiImportIdField(),
		id: ourRandomUUID(),
		field1: text("field1"),
		field2: text("field2"),
		field3: ourBigint("field3"),
		field4: ourBigint("field4"),
		field6: text({ enum: ["one", "two", "three"] })
			.notNull()
			.default("one"),
		field7: timestamp("field7"),
		field8: zeroText("field8"),
		repeatableNum1: integer("repeatable_num1"),
		repeatableText1: text("repeatable_text1"),
		repeatableNum2: integer("repeatable_num2"),
		repeatableText2: text("repeatable_text2"),
		repeatableNum3: integer("repeatable_num3"),
		repeatableText3: text("repeatable_text3"),
		jsonData: jsonb("json_data"),
		countryAccountsId: uuid("country_accounts_id").references(
			() => countryAccountsTable.id,
			{
				onDelete: "cascade",
			},
		),
		formStatus: text("form_status", { enum: ["draft", "submitted"] })
			.notNull()
			.default("draft"),
	},
	(table) => ({
		devExample2ApiImportIdTenantUnique: unique(
			"dev_example2_api_import_id_tenant_unique",
		).on(table.apiImportId, table.countryAccountsId),
	}),
);

export type SelectDevExample2 = typeof devExample2Table.$inferSelect;
export type InsertDevExample2 = typeof devExample2Table.$inferInsert;
