import { getAvailableLanguages } from "~/backend.server/translations";
import { dr } from "~/db.server";
import { InstanceSystemSettingRepository } from "~/db/queries/instanceSystemSettingRepository";

export class SettingsValidationError extends Error {
	errors: Record<string, string>;

	constructor(errors: Record<string, string>) {
		super("Validation Error");
		this.errors = errors;
	}
}

export const SettingsService = {
	async updateSettings(
		id: string | null,
		// privacyUrl: string | null,
		// termsUrl: string | null,
		// websiteLogoUrl: string,
		instanceName: string,
		// isApprovedRecordsPublic: boolean,
		// totpIssuer: string,
		language: string,
	) {
		const errors: Record<string, string> = {};

		if (!id) {
			errors.id = "Instance system settings Id is required";
		}

		if (!instanceName || instanceName.trim().length === 0) {
			errors.instanceName = "Instance name is required";
		}

		// if (!totpIssuer || totpIssuer.trim().length === 0) {
		// 	errors.totpIssuer = "Totp Issuer is required";
		// }

		// if (!privacyUrl || privacyUrl.trim().length === 0) {
		// 	privacyUrl = null;
		// }

		// if (!termsUrl || termsUrl.trim().length === 0) {
		// 	termsUrl = null;
		// }

		// if (
		// 	isApprovedRecordsPublic === null ||
		// 	isApprovedRecordsPublic === undefined
		// ) {
		// 	errors.approvedRecordsArePublic =
		// 		"Approved records visibility is required";
		// }

		if (!language || !getAvailableLanguages().includes(language)) {
			errors.language = "Language is required and must be supported";
		}

		if (Object.keys(errors).length > 0) {
			throw new SettingsValidationError(errors);
		}

		// id is guaranteed to be non-null after validation
		const idNonNull = id as string;

		return dr.transaction(async (tx) => {
			const instanceSystemSettings =
				await InstanceSystemSettingRepository.update(
					idNonNull,
					{
						// footerUrlPrivacyPolicy: privacyUrl,
						// footerUrlTermsConditions: termsUrl,
						// websiteLogo: websiteLogoUrl,
						websiteName: instanceName,
						// approvedRecordsArePublic: isApprovedRecordsPublic,
						// totpIssuer,
						language,
					},
					tx,
				);

			return { instanceSystemSettings };
		});
	},
};
