import { pgTable, jsonb, uuid } from "drizzle-orm/pg-core";
import {
	HumanEffectsHidden,
	HumanEffectsCustomConfig,
} from "~/frontend/human_effects/defs";
import { countryAccountsTable } from "./countryAccountsTable";

export const humanDsgConfigTable = pgTable("human_dsg_config", {
	hidden: jsonb("hidden").$type<HumanEffectsHidden>(),
	custom: jsonb("custom").$type<HumanEffectsCustomConfig>(),
	countryAccountsId: uuid("country_accounts_id").references(
		() => countryAccountsTable.id,
		{
			onDelete: "cascade",
		},
	),
});
export type SelectHumanDsgConfig = typeof humanDsgConfigTable.$inferSelect;
export type InsertHumanDsgConfig = typeof humanDsgConfigTable.$inferInsert;
