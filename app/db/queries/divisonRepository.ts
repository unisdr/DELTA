import { and, eq } from "drizzle-orm";
import { dr, Tx } from "../../db.server";
import { divisionTable, InsertDivision } from "~/drizzle/schema/divisionTable";
export const DivisionRepository = {
	deleteByCountryAccountId: (countryAccountsId: string, tx?: Tx) => {
		return (tx ?? dr)
			.delete(divisionTable)
			.where(eq(divisionTable.countryAccountsId, countryAccountsId));
	},
	getByCountryAccountsId: (countryAccountsId: string, tx?: Tx) => {
		return (tx ?? dr)
			.select()
			.from(divisionTable)
			.where(eq(divisionTable.countryAccountsId, countryAccountsId));
	},
	createMany: (data: InsertDivision[], tx?: Tx) => {
		return (tx ?? dr).insert(divisionTable).values(data).returning().execute();
	},
	getById: async (id: string, countryAccountsId: string, tx?: Tx) => {
		const rows = await (tx ?? dr)
			.select()
			.from(divisionTable)
			.where(
				and(
					eq(divisionTable.id, id),
					eq(divisionTable.countryAccountsId, countryAccountsId),
				),
			);
		return rows[0] ?? null;
	},
	update: async (
		id: string,
		data: InsertDivision,
		countryAccountsId: string,
		tx?: Tx,
	): Promise<{ ok: boolean; errors?: string[] }> => {
		try {
			const updated = await (tx ?? dr)
				.update(divisionTable)
				.set(data)
				.where(
					and(
						eq(divisionTable.id, id),
						eq(divisionTable.countryAccountsId, countryAccountsId),
					),
				)
				.returning({ id: divisionTable.id });

			if (!updated.length) {
				return { ok: false, errors: ["Division not found or access denied"] };
			}

			return { ok: true };
		} catch {
			return { ok: false, errors: ["Failed to update the division"] };
		}
	},
};
