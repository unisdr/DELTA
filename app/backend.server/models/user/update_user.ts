import { dr } from "~/db.server";
import { and, eq, sql } from "drizzle-orm";

import { userCountryAccountsTable } from "~/drizzle/schema/userCountryAccountsTable";
import { userTable } from "~/drizzle/schema";

import { Errors, hasErrors } from "~/frontend/form";

import { errorIsNotUnique } from "~/utils/db";

import { logAudit } from "./../auditLogs";

type AdminUpdateUserResult =
	| { ok: true; userId: string }
	| { ok: false; errors: Errors<AdminUpdateUserFields> };

export interface AdminUpdateUserFields {
	generatedSystemIdentifier: string;
	activated: any;
	dateAdded: any;
	email: string;
	emailVerified: boolean;
	firstName: string;
	lastName: string;
	// organization: string;
	role: string;
}

export async function adminUpdateUser(
	id: string,
	fields: AdminUpdateUserFields,
	userId: string,
	countryAccountsId: string,
): Promise<AdminUpdateUserResult> {
	let errors: Errors<AdminUpdateUserFields> = {};
	errors.form = [];
	errors.fields = {};
	if (fields.email == "") {
		errors.fields.email = ["Email is empty"];
	}
	if (fields.firstName == "") {
		errors.fields.firstName = ["First name is empty"];
	}
	if (fields.role == "") {
		errors.fields.role = ["Role is required"];
	}

	if (hasErrors(errors)) {
		return { ok: false, errors };
	}

	const oldRecord = await dr
		.select()
		.from(userTable)
		.where(eq(userTable.id, id));

	let updatedUser = null;
	let updatedUserCountryAccounts = null;
	try {
		await dr.transaction(async (tx) => {
			updatedUser = await tx
				.update(userTable)
				.set({
					email: fields.email,
					firstName: fields.firstName,
					lastName: fields.lastName,
					// organization: fields.organization,
					updatedAt: sql`CURRENT_TIMESTAMP`,
				})
				.where(eq(userTable.id, id))
				.returning();

			updatedUserCountryAccounts = await tx
				.update(userCountryAccountsTable)
				.set({
					role: fields.role,
				})
				.where(
					and(
						eq(userCountryAccountsTable.userId, id),
						eq(userCountryAccountsTable.countryAccountsId, countryAccountsId),
					),
				)
				.returning();

			await logAudit({
				tableName: "user",
				recordId: oldRecord[0].id + "",
				userId: userId,
				action: "Update user data",
				oldValues: oldRecord[0],
				newValues: updatedUser[0],
				tx,
			});
		});

		if (!updatedUser) {
			errors.form.push("User was not found using provided ID.");
			return { ok: false, errors };
		}
		if (!updatedUserCountryAccounts) {
			errors.form.push("User is not assign to your country accounts.");
			return { ok: false, errors };
		}
	} catch (e: any) {
		if (errorIsNotUnique(e, "user", "email")) {
			errors.fields.email = ["A user with this email already exists"];
			return { ok: false, errors };
		}
		throw e;
	}

	return { ok: true, userId: id };
}
