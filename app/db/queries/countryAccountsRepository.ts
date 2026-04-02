import { userCountryAccountsTable } from "~/drizzle/schema/userCountryAccountsTable";
import {
	countryAccountsTable,
	type InsertCountryAccounts,
} from "~/drizzle/schema/countryAccountsTable";
import { and, eq } from "drizzle-orm";
import { dr, Tx } from "~/db.server";

export const CountryAccountsRepository = {
	async getById(id: string) {
		if (!id || typeof id !== "string") return null;
		const [countryAccount] = await dr
			.select()
			.from(countryAccountsTable)
			.where(eq(countryAccountsTable.id, id));
		return countryAccount || null;
	},

	async getAllWithUserCountryAccountsAndUser() {
		return await dr.query.countryAccountsTable.findMany({
			with: {
				country: true,
				userCountryAccounts: {
					where: eq(userCountryAccountsTable.isPrimaryAdmin, true),
					limit: 1,
					with: {
						user: true,
					},
				},
			},
			columns: {
				id: true,
				status: true,
				type: true,
				shortDescription: true,
				createdAt: true,
				updatedAt: true,
			},
			orderBy: (countryAccounts, { desc }) => [desc(countryAccounts.createdAt)],
		});
	},

	async getAllWithUserCountryAccountsAndUserPaginated(
		offset: number,
		limit: number,
	) {
		return await dr.query.countryAccountsTable.findMany({
			with: {
				country: true,
				userCountryAccounts: {
					where: eq(userCountryAccountsTable.isPrimaryAdmin, true),
					limit: 1,
					with: {
						user: true,
					},
				},
			},
			columns: {
				id: true,
				status: true,
				type: true,
				shortDescription: true,
				createdAt: true,
				updatedAt: true,
			},
			offset,
			limit,
			orderBy: (countryAccounts, { desc }) => [desc(countryAccounts.createdAt)],
		});
	},

	async getByIdWithCountry(id: string) {
		const result = await dr.query.countryAccountsTable.findFirst({
			where: (account, { eq }) => eq(account.id, id),
			with: {
				country: true,
			},
			columns: {
				id: true,
				countryId: true,
				status: true,
				shortDescription: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		return result ?? null;
	},

	async getByIdWithCountryAndPrimaryAdminUser(id: string) {
		const result = await dr.query.countryAccountsTable.findFirst({
			where: (account, { eq }) => eq(account.id, id),
			with: {
				country: true,
				userCountryAccounts: {
					where: eq(userCountryAccountsTable.isPrimaryAdmin, true),
					limit: 1,
					with: {
						user: true,
					},
				},
			},
			columns: {
				id: true,
				type: true,
			},
		});

		return result ?? null;
	},

	async getByCountryIdAndType(
		countryId: string,
		type: string,
	): Promise<boolean> {
		const result = await dr
			.select()
			.from(countryAccountsTable)
			.where(
				and(
					eq(countryAccountsTable.countryId, countryId),
					eq(countryAccountsTable.type, type),
				),
			)
			.limit(1)
			.execute();

		return result.length > 0;
	},

	async create(data: Omit<InsertCountryAccounts, "id">, tx?: Tx) {
		const db = tx || dr;
		const result = await db
			.insert(countryAccountsTable)
			.values(data)
			.returning()
			.execute();
		return result[0];
	},

	async update(id: string, status: number, shortDescription: string, tx?: Tx) {
		const db = tx || dr;
		const result = await db
			.update(countryAccountsTable)
			.set({ status, updatedAt: new Date(), shortDescription })
			.where(eq(countryAccountsTable.id, id))
			.returning()
			.execute();
		return result[0] || null;
	},
	async deleteById(id: string, tx?: Tx) {
		const db = tx || dr;
		await db
			.delete(countryAccountsTable)
			.where(eq(countryAccountsTable.id, id));
	},
};
export type CountryAccountWithCountryAndPrimaryAdminUser = Awaited<
	ReturnType<
		typeof CountryAccountsRepository.getAllWithUserCountryAccountsAndUser
	>
>[number];
