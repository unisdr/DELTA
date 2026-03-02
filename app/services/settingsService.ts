import { getAvailableLanguages } from "~/backend.server/translations";
import { dr } from "~/db.server";
import {
	getCountryAccountWithCountryById,
	updateCountryAccount,
} from "~/db/queries/countryAccounts";
import { updateInstanceSystemSetting } from "~/db/queries/instanceSystemSetting";
import {
	CountryAccountStatus,
	countryAccountStatuses,
} from "~/drizzle/schema/countryAccounts";
import { checkValidCurrency } from "~/utils/currency";

export class SettingsValidationError extends Error {
	constructor(public errors: string[]) {
		super("Settings validation failed");
		this.name = "ValidationError";
	}
}

export async function updateSettingsService(
	id: string | null,
	privacyUrl: string | null,
	termsUrl: string | null,
	websiteLogoUrl: string,
	websiteName: string,
	isApprovedRecordsPublic: boolean,
	totpIssuer: string,
	currency: string,
	language: string,
) {
	const errors: string[] = [];
	if (!id) {
		errors.push("Instance system settings Id is required");
	}
	if (!websiteLogoUrl || websiteLogoUrl.trim().length === 0) {
		errors.push("Website logo URL is required");
	}
	if (!websiteName || websiteName.trim().length === 0) {
		errors.push("Website name is required");
	}
	if (!totpIssuer || totpIssuer.trim().length === 0) {
		errors.push("Totp Issuer is required");
	}
	if (!privacyUrl || privacyUrl.trim().length === 0) {
		privacyUrl = null;
	}
	if (!termsUrl || termsUrl.trim().length === 0) {
		termsUrl = null;
	}
	if (
		isApprovedRecordsPublic === null ||
		isApprovedRecordsPublic === undefined
	) {
		errors.push("Approved records visibility is required");
	}
	if (!checkValidCurrency(currency)) {
		errors.push("Invalid currency.");
	}
	if (!language || !getAvailableLanguages().includes(language)) {
		errors.push("Language is required and must be supported");
	}
	if (errors.length > 0) {
		throw new SettingsValidationError(errors);
	}

	return dr.transaction(async (tx) => {
		const instanceSystemSettings = await updateInstanceSystemSetting(
			tx,
			id,
			privacyUrl,
			termsUrl,
			websiteLogoUrl,
			websiteName,
			isApprovedRecordsPublic,
			totpIssuer,
			currency,
			language,
		);

		return { instanceSystemSettings };
	});
}

export async function updateCountryAccountService(
	id: string,
	status: number,
	shortDescription: string,
) {
	const countryAccount = await getCountryAccountWithCountryById(id);
	if (!countryAccount) {
		throw new SettingsValidationError([
			`Country accounts id:${id} does not exist`,
		]);
	}
	if (
		!Object.values(countryAccountStatuses).includes(
			status as CountryAccountStatus,
		)
	) {
		throw new SettingsValidationError([
			`Status: ${status} is not a valid value`,
		]);
	}

	const updatedCountryAccount = await updateCountryAccount(
		id,
		status,
		shortDescription,
	);
	return { updatedCountryAccount };
}
