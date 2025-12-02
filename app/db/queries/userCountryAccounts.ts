import {
	InsertUserCountryAccounts,
	SelectUserCountryAccounts,
	userCountryAccounts,
	userTable,
} from "../../drizzle/schema";
import { and, eq, sql } from "drizzle-orm";
import { dr, Tx } from "~/db.server";
import { organization, user } from "~/drizzle/migrations/schema";

export async function getUserCountryAccountsByUserId(
	userId: string
): Promise<SelectUserCountryAccounts[]> {
	return await dr
		.select()
		.from(userCountryAccounts)
		.where(eq(userCountryAccounts.userId, userId))
		.execute();
}

export async function createUserCountryAccounts(
	userId: string,
	countryAccountsId: string,
	role: string,
	isPrimaryAdmin: boolean,
	tx?: Tx
): Promise<SelectUserCountryAccounts> {
	const newUserCountryAccounts: InsertUserCountryAccounts = {
		userId,
		countryAccountsId,
		role,
		isPrimaryAdmin,
	};
	const db = tx || dr;
	const result = await db
		.insert(userCountryAccounts)
		.values(newUserCountryAccounts)
		.returning()
		.execute();
	return result[0];
}

export async function getUserCountryAccountsWithUserByCountryAccountsId(
	pageNumber: number,
	pageSize: number,
	countryAccountsId: string
) {
	const offset = pageNumber * pageSize;
	const items = await dr.query.userCountryAccounts.findMany({
		where: eq(userCountryAccounts.countryAccountsId, countryAccountsId),
		limit: pageSize,
		offset: offset,
		with: {
			user: true,
		},
	});
	const total = await dr.$count(
		userCountryAccounts,
		eq(userCountryAccounts.countryAccountsId, countryAccountsId)
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
	tx?: Tx
): Promise<boolean> {
	const db = tx || dr;
	const result = await db
		.select({ count: sql`count(*)`.mapWith(Number) })
		.from(userTable)
		.innerJoin(
			userCountryAccounts,
			eq(userTable.id, userCountryAccounts.userId)
		)
		.where(
			and(
				eq(userTable.email, email),
				eq(userCountryAccounts.countryAccountsId, countryAccountsId)
			)
		)
		.execute();

	return result[0].count > 0;
}

export async function doesUserCountryAccountExistByUserIdAndCountryAccountsId(
	userId: string,
	countryAccountsId: string,
	tx?: Tx
): Promise<boolean> {
	const db = tx || dr;
	const result = await db
		.select({ count: sql`count(*)`.mapWith(Number) })
		.from(userTable)
		.innerJoin(
			userCountryAccounts,
			eq(userTable.id, userCountryAccounts.userId)
		)
		.where(
			and(
				eq(userTable.id, userId),
				eq(userCountryAccounts.countryAccountsId, countryAccountsId)
			)
		)
		.execute();

	return result[0].count > 0;
}

export async function getUserCountryAccountsByUserIdAndCountryAccountsId(
	userId: string,
	countryAccountsId: string,
	tx?: Tx
) {
	const db = tx || dr;
	const result = await db
		.select()
		.from(userCountryAccounts)
		.innerJoin(userTable, eq(userTable.id, userCountryAccounts.userId))
		.where(
			and(
				eq(userTable.id, userId),
				eq(userCountryAccounts.countryAccountsId, countryAccountsId)
			)
		)
		.execute();
	return result.length > 0 ? result[0] : null;
}

export async function deleteUserCountryAccountsByUserIdAndCountryAccountsId(
	userId: string,
	countryAccountsId: string,
	tx?: Tx
) {
	const db = tx || dr;
	const result = await db
		.delete(userCountryAccounts)
		.where(
			and(
				eq(userCountryAccounts.userId, userId),
				eq(userCountryAccounts.countryAccountsId, countryAccountsId)
			)
		)
		.execute();
	return result.rowCount;
}


export async function getUserCountryAccountsWithValidatorRole(
	countryAccountsId: string
) {
	const users = await dr.select(
		{
			id: user.id,
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			role: userCountryAccounts.role,
			isPrimaryAdmin: userCountryAccounts.isPrimaryAdmin,
			organization: user.organization,
		}
	).from(userCountryAccounts)
	.where(
		and(
			eq(userCountryAccounts.countryAccountsId, countryAccountsId),
			eq(userCountryAccounts.role, "data-validator"),
			eq(user.emailVerified, true)
		)
	)
	.innerJoin(user, eq(user.id, userCountryAccounts.userId));

	return users
;
}