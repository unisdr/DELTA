import {
	InsertUserCountryAccounts,
	userCountryAccountsTable,
} from "~/drizzle/schema/userCountryAccountsTable";
import { userTable } from "~/drizzle/schema";
import { and, eq, sql } from "drizzle-orm";
import { dr, Tx } from "~/db.server";

export async function getUserCountryAccountsWithUserByCountryAccountsId(
	pageNumber: number,
	pageSize: number,
	countryAccountsId: string,
) {
	const offset = pageNumber * pageSize;
	const items = await dr.query.userCountryAccountsTable.findMany({
		where: eq(userCountryAccountsTable.countryAccountsId, countryAccountsId),
		limit: pageSize,
		offset: offset,
		with: {
			user: {
				columns: {
					id: true,
					firstName: true,
					lastName: true,
					email: true,
					emailVerified: true,
				},
			},
			organization: {
				columns: {
					id: true,
					name: true,
				},
			},
		},
	});
	const total = await dr.$count(
		userCountryAccountsTable,
		eq(userCountryAccountsTable.countryAccountsId, countryAccountsId),
	);

	return {
		items,
		pagination: {
			total,
			pageNumber,
			pageSize,
			totalPages: Math.ceil(total / pageSize),
			extraParams: {},
		},
	};
}

export async function doesUserCountryAccountExistByEmailAndCountryAccountsId(
	email: string,
	countryAccountsId: string,
	tx?: Tx,
): Promise<boolean> {
	const db = tx || dr;
	const result = await db
		.select({ count: sql`count(*)`.mapWith(Number) })
		.from(userTable)
		.innerJoin(
			userCountryAccountsTable,
			eq(userTable.id, userCountryAccountsTable.userId),
		)
		.where(
			and(
				eq(userTable.email, email),
				eq(userCountryAccountsTable.countryAccountsId, countryAccountsId),
			),
		)
		.execute();

	return result[0].count > 0;
}

export async function getUserCountryAccountsByUserIdAndCountryAccountsId(
	userId: string,
	countryAccountsId: string,
	tx?: Tx,
) {
	const db = tx || dr;
	const result = await db
		.select()
		.from(userCountryAccountsTable)
		.where(
			and(
				eq(userCountryAccountsTable.userId, userId),
				eq(userCountryAccountsTable.countryAccountsId, countryAccountsId),
			),
		)
		.execute();
	return result.length > 0 ? result[0] : null;
}

export async function deleteUserCountryAccountsByUserIdAndCountryAccountsId(
	userId: string,
	countryAccountsId: string,
	tx?: Tx,
) {
	const db = tx || dr;
	const result = await db
		.delete(userCountryAccountsTable)
		.where(
			and(
				eq(userCountryAccountsTable.userId, userId),
				eq(userCountryAccountsTable.countryAccountsId, countryAccountsId),
			),
		)
		.execute();
	return result.rowCount;
}

export async function getUserCountryAccountsWithValidatorRole(
	countryAccountsId: string,
) {
	const users = await dr
		.select({
			id: userTable.id,
			email: userTable.email,
			firstName: userTable.firstName,
			lastName: userTable.lastName,
			role: userCountryAccountsTable.role,
			isPrimaryAdmin: userCountryAccountsTable.isPrimaryAdmin,
			// organization: userTable.organization,
		})
		.from(userCountryAccountsTable)
		.where(
			and(
				eq(userCountryAccountsTable.countryAccountsId, countryAccountsId),
				eq(userCountryAccountsTable.role, "data-validator"),
				eq(userTable.emailVerified, true),
			),
		)
		.innerJoin(userTable, eq(userTable.id, userCountryAccountsTable.userId))
		.orderBy(userTable.firstName, userTable.lastName);

	return users;
}

export async function updateUserCountryAccountsById(
	id: string,
	data: Partial<Omit<InsertUserCountryAccounts, "id">>,
	tx?: Tx,
): Promise<InsertUserCountryAccounts> {
	const db = tx || dr;
	const [updatedUserCountryAccounts] = await db
		.update(userCountryAccountsTable)
		.set({
			...data,
			organizationId: data.organizationId ?? null,
		})
		.where(eq(userCountryAccountsTable.id, id))
		.returning();
	if (!updatedUserCountryAccounts) {
		throw new Error(`UserCountryAccount with id ${id} not found`);
	}

	return updatedUserCountryAccounts;
}

export const UserCountryAccountRepository = {
	deleteByCountryAccountIdAndIsPrimaryAdmin: (
		countryAccountsId: string,
		isPrimaryAdmin: boolean,
		tx?: Tx,
	) => {
		return (tx ?? dr)
			.delete(userCountryAccountsTable)
			.where(
				and(
					eq(userCountryAccountsTable.countryAccountsId, countryAccountsId),
					eq(userCountryAccountsTable.isPrimaryAdmin, isPrimaryAdmin),
				),
			);
	},
	getByUserId: (userId: string, tx?: Tx) => {
		return (tx ?? dr)
			.select()
			.from(userCountryAccountsTable)
			.where(eq(userCountryAccountsTable.userId, userId));
	},
	create: (
		data: Omit<InsertUserCountryAccounts, "id" | "addedAt">,
		tx?: Tx,
	) => {
		return (tx ?? dr)
			.insert(userCountryAccountsTable)
			.values(data)
			.returning()
			.execute()
			.then((r) => r[0]);
	},
};
