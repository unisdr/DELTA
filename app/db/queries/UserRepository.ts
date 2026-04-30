import { eq } from "drizzle-orm";
import { dr, Tx } from "../../db.server";
import { InsertUser, SelectUser, userTable } from "~/drizzle/schema";
import { isValidUUID } from "~/utils/id";

export const UserRepository = {
	getById: async (id: string, tx?: Tx): Promise<SelectUser | null> => {
		if (!isValidUUID(id)) {
			throw new Error(`Invalid UUID: ${id}`);
		}
		const result = await (tx ?? dr)
			.select()
			.from(userTable)
			.where(eq(userTable.id, id))
			.limit(1)
			.execute();
		return result[0] ?? null;
	},
	getByEmail: async (email: string, tx?: Tx): Promise<SelectUser | null> => {
		const result = await (tx ?? dr)
			.select()
			.from(userTable)
			.where(eq(userTable.email, email))
			.limit(1)
			.execute();
		return result[0] ?? null;
	},
	create: (
		data: Omit<InsertUser, "id" | "createdAt" | "updatedAt">,
		tx?: Tx,
	) => {
		return (tx ?? dr)
			.insert(userTable)
			.values(data)
			.returning()
			.execute()
			.then((result) => result[0]);
	},
	updateById: (
		userId: string,
		data: Partial<Omit<InsertUser, "id">>,
		tx?: Tx,
	) => {
		if (!isValidUUID(userId)) {
			throw new Error(`Invalid UUID: ${userId}`);
		}
		return (tx ?? dr)
			.update(userTable)
			.set({
				...data,
				updatedAt: new Date(),
			})
			.where(eq(userTable.id, userId))
			.returning()
			.execute()
			.then((result) => result[0] ?? null);
	},
};
