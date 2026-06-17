import "../setup";
import { eq } from "drizzle-orm";
import { describe, it, expect } from "vitest";
import { dr } from "~/db.server";
// noticesTable is imported from the app schema barrel to prove the barrel export works.
import { noticesTable } from "~/drizzle/schema";
// countriesTable and countryAccounts are imported from testSchema because the PGlite
// in-memory database is built from testSchema (which omits columns added after the
// testSchema was last hand-synced, e.g. the `type` column on countries).
import { countriesTable } from "../testSchema/countriesTable";
import { countryAccounts } from "../testSchema/countryAccounts";

/** Helper: insert a countries row and return its id. */
async function insertCountry(suffix: string): Promise<string> {
	const [row] = await dr
		.insert(countriesTable)
		.values({ name: `Test Country ${suffix}` })
		.returning({ id: countriesTable.id });
	return row.id;
}

/** Helper: insert a countryAccounts row and return its id. */
async function insertCountryAccount(countryId: string): Promise<string> {
	const [row] = await dr
		.insert(countryAccounts)
		.values({ shortDescription: "TST", countryId })
		.returning({ id: countryAccounts.id });
	return row.id;
}

describe("noticesTable", () => {
	it("(a) inserts a minimal draft notice and applies correct defaults", async () => {
		const countryId = await insertCountry(crypto.randomUUID().slice(0, 8));
		const countryAccountsId = await insertCountryAccount(countryId);

		const [row] = await dr
			.insert(noticesTable)
			.values({ countryAccountsId, titleJson: { en: "Draft Notice" } })
			.returning();

		expect(row.id).toBeTruthy();
		expect(row.isPublished).toBe(false);
		expect(row.audience).toBe("private");
		expect(row.publishedAt).toBeNull();
		expect(row.titleJson).toEqual({ en: "Draft Notice" });
		expect(row.bodyJson).toBeNull();
		expect(row.createdAt).toBeInstanceOf(Date);
	});

	it("(b) inserts a fully populated notice and retrieves all values intact", async () => {
		const countryId = await insertCountry(crypto.randomUUID().slice(0, 8));
		const countryAccountsId = await insertCountryAccount(countryId);
		const publishedAt = new Date("2026-01-15T12:00:00Z");
		const titleJson = { en: "Test Title", fr: "Titre de test" };
		const bodyJson = { en: "Body content", fr: "Contenu du corps" };

		const [row] = await dr
			.insert(noticesTable)
			.values({
				countryAccountsId,
				titleJson,
				bodyJson,
				isPublished: true,
				publishedAt,
				audience: "public",
			})
			.returning();

		expect(row.isPublished).toBe(true);
		expect(row.audience).toBe("public");
		expect(row.publishedAt).toEqual(publishedAt);
		expect(row.titleJson).toEqual(titleJson);
		expect(row.bodyJson).toEqual(bodyJson);
	});

	it("(c) audience column only accepts declared enum values", async () => {
		// Per design.md Decision 2, the codebase uses text({ enum: [...] }) rather than
		// pgEnum due to a known drizzle-kit bug (drizzle-team/drizzle-orm#3485). Drizzle
		// exposes the enum members as a union type on the column definition. This test
		// verifies that all three declared enum values are present on the table definition
		// and that the column resolves correctly as a string-union type.
		const enumValues = noticesTable.audience.enumValues;
		expect(enumValues).toEqual(["public", "private", "all"]);
	});

	it("(d) concurrent inserts via Promise.all persist both rows without conflict", async () => {
		const countryId1 = await insertCountry(crypto.randomUUID().slice(0, 8));
		const countryId2 = await insertCountry(crypto.randomUUID().slice(0, 8));
		const countryAccountsId1 = await insertCountryAccount(countryId1);
		const countryAccountsId2 = await insertCountryAccount(countryId2);

		const [result1, result2] = await Promise.all([
			dr
				.insert(noticesTable)
				.values({ countryAccountsId: countryAccountsId1, titleJson: { en: "Notice 1" } })
				.returning(),
			dr
				.insert(noticesTable)
				.values({ countryAccountsId: countryAccountsId2, titleJson: { en: "Notice 2" } })
				.returning(),
		]);

		expect(result1).toHaveLength(1);
		expect(result2).toHaveLength(1);
		expect(result1[0].id).not.toBe(result2[0].id);
	});

	it("(e) noticesTable is importable from the schema barrel", () => {
		// The import at the top of this file is the assertion —
		// if the barrel does not export noticesTable, the module will not load.
		expect(noticesTable).toBeDefined();
	});

	it("(f) deleting the parent countryAccounts row cascades and removes its notices", async () => {
		const countryId = await insertCountry(crypto.randomUUID().slice(0, 8));
		const countryAccountsId = await insertCountryAccount(countryId);

		const [inserted] = await dr
			.insert(noticesTable)
			.values({ countryAccountsId, titleJson: { en: "Cascade Test" } })
			.returning({ id: noticesTable.id });

		// Delete the parent tenant row — cascade should remove its notices automatically.
		await dr
			.delete(countryAccounts)
			.where(eq(countryAccounts.id, countryAccountsId));

		const remaining = await dr
			.select({ id: noticesTable.id })
			.from(noticesTable)
			.where(eq(noticesTable.id, inserted.id));

		expect(remaining).toHaveLength(0);
	});
});
