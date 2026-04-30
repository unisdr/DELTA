import "../setup";
import { eq } from "drizzle-orm";
import { describe, it, expect } from "vitest";
import { dr } from "~/db.server";
import { deleteByIdForStringId } from "~/backend.server/models/common";
import { userTable } from "~/drizzle/schema";

describe("deleteByIdForStringId", () => {
	it("throws when the record does not exist", async () => {
		const nonExistentId = crypto.randomUUID();
		await expect(
			deleteByIdForStringId(nonExistentId, userTable),
		).rejects.toThrow();
	});

	it("deletes the row and resolves when the record exists", async () => {
		const userId = crypto.randomUUID();
		await dr.insert(userTable).values({
			id: userId,
			email: `test-${userId}@example.com`,
		});

		await expect(
			deleteByIdForStringId(userId, userTable),
		).resolves.not.toThrow();

		const remaining = await dr
			.select({ id: userTable.id })
			.from(userTable)
			.where(eq(userTable.id, userId));
		expect(remaining).toHaveLength(0);
	});
});
