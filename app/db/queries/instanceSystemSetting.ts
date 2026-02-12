import { eq } from "drizzle-orm";
import {
	SelectInstanceSystemSettings,
	instanceSystemSettingsTable,
	InsertInstanceSystemSettings,
} from "~/drizzle/schema/instanceSystemSettingsTable";
import { dr, Tx } from "~/db.server";

export async function getInstanceSystemSettingsByCountryAccountId(
	countryAccountId: string | null,
	tx?: Tx,
): Promise<SelectInstanceSystemSettings | null> {
	if (!countryAccountId) {
		return null;
	}
	const db = tx || dr;
	const result = await db
		.select()
		.from(instanceSystemSettingsTable)
		.where(eq(instanceSystemSettingsTable.countryAccountsId, countryAccountId));
	return result[0] || null;
}

export async function createInstanceSystemSetting(
	countryName: string,
	countryIso3: string,
	countryAccountId: string,
	tx?: Tx,
): Promise<InsertInstanceSystemSettings> {
	const db = tx || dr;
	const result = await db
		.insert(instanceSystemSettingsTable)
		.values({
			countryName: countryName,
			dtsInstanceCtryIso3: countryIso3,
			countryAccountsId: countryAccountId,
		})
		.returning()
		.execute();
	return result[0];
}

export async function updateInstanceSystemSetting(
	tx: Tx,
	id: string | null,
	footerUrlPrivacyPolicy: string | null,
	footerUrlTermsConditions: string | null,
	websiteLogo: string,
	websiteName: string,
	approvedRecordsArePublic: boolean,
	totpIssuer: string,
	currency: string,
	language: string,
): Promise<SelectInstanceSystemSettings | null> {
	if (!id) {
		return null;
	}
	const result = await tx
		.update(instanceSystemSettingsTable)
		.set({
			footerUrlPrivacyPolicy,
			footerUrlTermsConditions,
			websiteLogo,
			websiteName,
			approvedRecordsArePublic,
			totpIssuer,
			currencyCode: currency,
			language,
		})
		.where(eq(instanceSystemSettingsTable.id, id))
		.returning()
		.execute();
	return result[0];
}
