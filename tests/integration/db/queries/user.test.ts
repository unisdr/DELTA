import { eq } from "drizzle-orm";
import { describe, it, expect } from "vitest";
import { dr } from "~/db.server";
import { getUserById } from "~/db/queries/user";
import { userTable } from "~/drizzle/schema";

describe("getUserById", () => {
	it("should return the user when ID exists", async () => {
		const userId = crypto.randomUUID();
		try {
			const [inserted] = await dr
				.insert(userTable)
				.values({
					id: userId,
					email: "alice@example.com",
					firstName: "Alice",
				})
				.returning();

			const user = await getUserById(userId);
			expect(user).toEqual(inserted);
		} finally {
			await dr.delete(userTable).where(eq(userTable.id, userId));
		}
	});

	it("should return null when user does not exist", async () => {
		const user = await getUserById(crypto.randomUUID());
		expect(user).toBeNull();
	});

	it("should throw error if empty string, invalid ID, invalid UUID", async () => {
		await expect(getUserById("")).rejects.toThrow();
		await expect(getUserById("   ")).rejects.toThrow();
		await expect(
			getUserById("50a3b7c1-8f2d-4d9a-9e1c-3b8f4e"),
		).rejects.toThrow();
	});
});
