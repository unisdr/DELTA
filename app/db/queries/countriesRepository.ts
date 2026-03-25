import { dr, Tx } from "~/db.server";
import {
	countriesTable,
	CountryType,
	InsertCountries,
} from "~/drizzle/schema/countriesTable";
import { eq } from "drizzle-orm";

export const CountryRepository = {
	getAll: async (tx?: Tx) => {
		return (tx ?? dr).select().from(countriesTable);
	},
	create: async (data: Omit<InsertCountries, "id">, tx?: Tx) => {
		return (tx ?? dr)
			.insert(countriesTable)
			.values(data)
			.returning()
			.execute()
			.then((result) => result[0]);
	},
	deleteById: async (id: string, tx?: Tx) => {
		return (tx ?? dr).delete(countriesTable).where(eq(countriesTable.id, id));
	},
	updateById: async (
		id: string,
		data: Partial<Omit<InsertCountries, "id">>,
		tx?: Tx,
	) => {
		return (tx ?? dr)
			.update(countriesTable)
			.set(data)
			.where(eq(countriesTable.id, id));
	},
	getByTypeOrderByName: async (type: CountryType, tx?: Tx) => {
		return (tx ?? dr)
			.select({
				id: countriesTable.id,
				name: countriesTable.name,
				type: countriesTable.type,
			})
			.from(countriesTable)
			.where(eq(countriesTable.type, type))
			.orderBy(countriesTable.name);
	},
	getById: async (id: string, tx?: Tx) => {
		return (tx ?? dr)
			.select()
			.from(countriesTable)
			.where(eq(countriesTable.id, id))
			.execute()
			.then((result) => result[0] || null);
	},
	getByName: async (name: string, tx?: Tx) => {
		return (tx ?? dr)
			.select()
			.from(countriesTable)
			.where(eq(countriesTable.name, name))
			.execute()
			.then((result) => result[0] || null);
	},
};
