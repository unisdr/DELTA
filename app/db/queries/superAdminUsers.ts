import { eq } from "drizzle-orm";
import { dr } from "~/db.server";
import { SelectSuperAdmins, superAdminUsersTable } from "~/drizzle/schema/superAdminUsersTable";

export async function getSuperAdminUserByEmail(email: string): Promise<SelectSuperAdmins | null> {
	const result = await dr
		.select()
		.from(superAdminUsersTable)
		.where(eq(superAdminUsersTable.email, email))
		.limit(1)
		.execute();
	return result[0] ?? null;
}

export async function updateSuperAdminUser(
	id: string,
	data: Partial<Omit<SelectSuperAdmins, "id">>,
): Promise<SelectSuperAdmins | null> {
	const result = await dr
		.update(superAdminUsersTable)
		.set(data)
		.where(eq(superAdminUsersTable.id, id))
		.returning();

	return result[0] ?? null;
}
