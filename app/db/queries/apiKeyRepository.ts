import { desc, eq } from "drizzle-orm";
import { dr, Tx } from "../../db.server";
import { apiKeyTable, InsertApiKey } from "~/drizzle/schema/apiKeyTable";
import { randomBytes } from "crypto";

function generateSecret(): string {
	return randomBytes(32).toString("hex");
}

export const ApiKeyRepository = {
	getById: (id: string) => {
		return dr.query.apiKeyTable.findFirst({
			where: eq(apiKeyTable.id, id),
			with: { managedByUser: true },
		});
	},

	getByCountryAccountsIdWithUser: (countryAccountsId: string) => {
		return dr.query.apiKeyTable.findMany({
			where: eq(apiKeyTable.countryAccountsId, countryAccountsId),
			orderBy: [desc(apiKeyTable.name)],
			with: { managedByUser: true },
		});
	},

	create: (
		data: {
			name: string;
			managedByUserId?: string | null;
			countryAccountsId?: string | null;
		},
		tx?: Tx,
	) => {
		return (tx ?? dr)
			.insert(apiKeyTable)
			.values({
				createdAt: new Date(),
				name: data.name,
				managedByUserId: data.managedByUserId!,
				secret: generateSecret(),
				countryAccountsId: data.countryAccountsId ?? null,
			})
			.returning({ id: apiKeyTable.id })
			.execute();
	},

	update: (id: string, name: string, tx?: Tx) => {
		return (tx ?? dr)
			.update(apiKeyTable)
			.set({ updatedAt: new Date(), name })
			.where(eq(apiKeyTable.id, id))
			.execute();
	},

	delete: (id: string, tx?: Tx) => {
		return (tx ?? dr).delete(apiKeyTable).where(eq(apiKeyTable.id, id));
	},

	deleteByCountryAccountId: (countryAccountsId: string, tx?: Tx) => {
		return (tx ?? dr)
			.delete(apiKeyTable)
			.where(eq(apiKeyTable.countryAccountsId, countryAccountsId));
	},

	getByCountryAccountsId: (countryAccountsId: string, tx?: Tx) => {
		return (tx ?? dr)
			.select()
			.from(apiKeyTable)
			.where(eq(apiKeyTable.countryAccountsId, countryAccountsId));
	},

	getBySecret: (secret: string, tx?: Tx) => {
		return (tx ?? dr)
			.select()
			.from(apiKeyTable)
			.where(eq(apiKeyTable.secret, secret));
	},

	createMany: (data: InsertApiKey[], tx?: Tx) => {
		return (tx ?? dr).insert(apiKeyTable).values(data).returning().execute();
	},
};
