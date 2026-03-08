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
	errors: Record<string, string>;

	constructor(errors: Record<string, string>) {
		super("Validation Error");
		this.errors = errors;
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
	const errors: Record<string, string> = {};

	if (!id) {
		errors.id = "Instance system settings Id is required";
	}

	if (!websiteLogoUrl || websiteLogoUrl.trim().length === 0) {
		errors.websiteLogoUrl = "Website logo URL is required";
	}

	if (!websiteName || websiteName.trim().length === 0) {
		errors.websiteName = "Website name is required";
	}

	if (!totpIssuer || totpIssuer.trim().length === 0) {
		errors.totpIssuer = "Totp Issuer is required";
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
		errors.approvedRecordsArePublic = "Approved records visibility is required";
	}

	if (!checkValidCurrency(currency)) {
		errors.currency = "Invalid currency";
	}

	if (!language || !getAvailableLanguages().includes(language)) {
		errors.language = "Language is required and must be supported";
	}

	if (Object.keys(errors).length > 0) {
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
		throw new SettingsValidationError({
			id: `Country account id:${id} does not exist`,
		});
	}

	if (
		!Object.values(countryAccountStatuses).includes(
			status as CountryAccountStatus,
		)
	) {
		throw new SettingsValidationError({
			status: `Status ${status} is not a valid value`,
		});
	}

	const updatedCountryAccount = await updateCountryAccount(
		id,
		status,
		shortDescription,
	);

	return { updatedCountryAccount };
}
