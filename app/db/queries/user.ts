import { eq } from "drizzle-orm";
import { dr, Tx } from "../../db.server";
import { InsertUser, SelectUser, userTable } from "~/drizzle/schema";
import { isValidUUID } from "~/utils/id";

export async function getUserById(id: string): Promise<SelectUser | null> {
	if (!isValidUUID(id)) {
		throw new Error(`Invalid UUID: ${id}`);
	}
	const result = await dr
		.select()
		.from(userTable)
		.where(eq(userTable.id, id))
		.execute();
	return result[0] || null;
}

export async function getUserByEmail<T extends SelectUser = SelectUser>(
	email: string,
): Promise<SelectUser | null> {
	const result = await dr
		.select()
		.from(userTable)
		.where(eq(userTable.email, email))
		.limit(1)
		.execute();
	return (result[0] as T) ?? null;
}

export async function createUser(email: string, tx?: Tx): Promise<SelectUser>;

export async function createUser(
	email: string,
	tx: Tx | undefined,
	firstName: string,
	lastName: string,
	organization: string,
): Promise<SelectUser>;

export async function createUser(
	// common implementation of two possible function calls taking into account different use accross the code (admin creates user with email only)
	email: string,
	tx?: Tx,
	firstName?: string,
	lastName?: string,
	organization?: string,
) {
	const db = tx || dr;

	// do we have a firstname provided in parameters? If we don't, we only save the email (backward compatibility)
	const values = firstName
		? { email, firstName, lastName, organization }
		: { email };

	console.log("creating user in db", values);

	const result = await db
		.insert(userTable)
		.values(values)
		.returning()
		.execute();

	return result[0];
}

export async function updateUserById(
	userId: string,
	data: Partial<Omit<InsertUser, "id">>,
	tx?: Tx,
): Promise<SelectUser | null> {
	if (!userId) throw new Error("User ID is required");
	if (!data || Object.keys(data).length === 0) {
		throw new Error("No data provided to update");
	}

	const db = tx || dr;
	const [updatedUser] = await db
		.update(userTable)
		.set({
			...data,
			updatedAt: new Date(),
		})
		.where(eq(userTable.id, userId))
		.returning();

	return updatedUser ?? null;
}
