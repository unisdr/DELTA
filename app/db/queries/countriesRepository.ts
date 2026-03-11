import { dr, Tx } from "~/db.server";
import { countriesTable } from "~/drizzle/schema/countriesTable";
import { eq } from "drizzle-orm";

export const CountryRepository = {
	getAll: (tx?: Tx) => {
		return (tx ?? dr).select().from(countriesTable);
	},
	getById: (id: string, tx?: Tx) => {
		return (tx ?? dr)
			.select()
			.from(countriesTable)
			.where(eq(countriesTable.id, id))
			.execute()
			.then((result) => result[0] || null);
	},
};
