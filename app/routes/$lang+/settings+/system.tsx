import type { ActionFunction, MetaFunction } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import { useEffect, useRef, useState } from "react";
import { authLoaderWithPerm } from "~/utils/auth";
import { configApplicationEmail, configPublicUrl } from "~/utils/config";
import { NavSettings } from "~/frontend/components/NavSettings";
import { MainContainer } from "~/frontend/container";
import { getSystemInfo } from "~/db/queries/dtsSystemInfo";

import { InstanceSystemSettingRepository } from "~/db/queries/instanceSystemSettingRepository";
import { getCountryAccountsIdFromSession } from "~/utils/session";
import { CountryAccountsRepository } from "~/db/queries/countryAccountsRepository";
import { CountryRepository } from "~/db/queries/countriesRepository";
import {
	SettingsService,
	SettingsValidationError,
} from "~/services/settingsService";
import { Toast } from "primereact/toast";
import { getCurrencyList } from "~/utils/currency";
import { getUserRoleFromSession } from "~/utils/session";

import { ViewContext } from "~/frontend/context";
import { htmlTitle } from "~/utils/htmlmeta";
import { getAvailableLanguages } from "~/backend.server/translations";

import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";

type ActionSuccess = {
	success: "ok";
};

type ActionError = {
	errors: Record<string, string>;
};

type ActionData = ActionSuccess | ActionError;

export const loader = authLoaderWithPerm(
	"ManageCountrySettings",
	async (loaderArgs) => {
		const { request } = loaderArgs;
		const countryAccountsId = await getCountryAccountsIdFromSession(request);

		const settings =
			await InstanceSystemSettingRepository.getByCountryAccountId(countryAccountsId);
		const countryAccount = await CountryAccountsRepository.getById(countryAccountsId);
		let country = null;
		if (countryAccount) {
			country = await CountryRepository.getById(countryAccount.countryId);
		}
		const dtsSystemInfo = await getSystemInfo();

		let currencies: string[] = [];
		if (settings) {
			currencies.push(settings.currencyCode);
		}

		const confEmailObj = configApplicationEmail();

		const userRole = await getUserRoleFromSession(request);

		return {
			publicURL: configPublicUrl(),
			currencyArray: currencies,
			availableLanguages: getAvailableLanguages(),
			systemLanguage: settings?.language,
			confEmailObj,
			instanceSystemSettings: settings,
			dtsSystemInfo,
			country,
			userRole: userRole || "",
			countryAccountType: countryAccount?.type,
		};
	},
);

export const action: ActionFunction = authLoaderWithPerm(
	"EditData",
	async (args) => {
		const request = args.request;
		const formData = await request.formData();
		const id = formData.get("id") as string;
		const privacyUrl = formData.get("privacyUrl") as string;
		const termsUrl = formData.get("termsUrl") as string;
		const websiteLogoUrl = formData.get("websiteLogoUrl") as string;
		const websiteName = formData.get("websiteName") as string;
		const approvedRecordsArePublic =
			formData.get("approvedRecordsArePublic") === "true";
		const totpIssuer = formData.get("totpIssuer") as string;
		const currency = formData.get("currency") as string;
		const language = formData.get("language") as string;
		try {
			await SettingsService.updateSettings(
				id,
				privacyUrl,
				termsUrl,
				websiteLogoUrl,
				websiteName,
				approvedRecordsArePublic,
				totpIssuer,
				currency,
				language,
			);
			return { success: "ok" };
		} catch (error) {
			let errors = {};
			if (error instanceof SettingsValidationError) {
				errors = { errors: error.errors };
			} else {
				errors = { errors: ["An unexpected error occured"] };
				console.log(error);
			}
			return { ...errors };
		}
	},
);

export const meta: MetaFunction = () => {
	const ctx = new ViewContext();

	return [
		{
			title: htmlTitle(
				ctx,
				ctx.t({
					code: "meta.system_settings",
					msg: "System Settings",
				}),
			),
		},
		{
			name: "description",
			content: ctx.t({
				code: "meta.system_settings",
				msg: "System Settings",
			}),
		},
	];
};

export default function Settings() {

	const loaderData = useLoaderData<typeof loader>();
	const ctx = new ViewContext();
	const actionData = useActionData<ActionData>();

	// const fieldError = (field: string) => {
	// 	if (actionData && "errors" in actionData) {
	// 		const errs: any = actionData.errors;
	// 		return errs?.[field];
	// 	}
	// 	return null;
	// };

	const [privacyUrl, setPrivacyUrl] = useState("");
	const [termsUrl, setTermsUrl] = useState("");
	const [websiteLogoUrl, setWebsiteLogoUrl] = useState("");
	const [websiteName, setWebsiteName] = useState("");
	const [approvedRecordsArePublic, setApprovedRecordsArePublic] =
		useState(false);
	const [currency, setCurrency] = useState("");
	const [language, setLanguage] = useState(loaderData.systemLanguage);
	const [totpIssuer, setTotpIssuer] = useState("");

	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const toast = useRef<Toast>(null);
	const formRef = useRef<HTMLFormElement>(null);
	const [errors, setErrors] = useState<Record<string, string>>({});


	function showEditSettings() {
		if (loaderData.instanceSystemSettings) {
			setPrivacyUrl(
				loaderData.instanceSystemSettings.footerUrlPrivacyPolicy || "",
			);
			setTermsUrl(
				loaderData.instanceSystemSettings.footerUrlTermsConditions || "",
			);
			setWebsiteLogoUrl(loaderData.instanceSystemSettings.websiteLogo || "");
			setWebsiteName(loaderData.instanceSystemSettings.websiteName || "");
			setApprovedRecordsArePublic(
				loaderData.instanceSystemSettings.approvedRecordsArePublic,
			);
			setTotpIssuer(loaderData.instanceSystemSettings.totpIssuer || "");
			setCurrency(loaderData.instanceSystemSettings.currencyCode);
		}
		setIsDialogOpen(true);
	}

	useEffect(() => {
		if (actionData && "success" in actionData) {
			setIsDialogOpen(false);

			toast.current?.show({
				severity: "success",
				summary: ctx.t({ code: "common.success", msg: "Success" }),
				detail: ctx.t({
					code: "settings.system.updated_successfully",
					msg: "System settings updated successfully. Changes will take effect after you login again.",
				}),
				life: 4000,
			});
		}
	}, [actionData]);

	useEffect(() => {
		if (actionData && "errors" in actionData) {
			setErrors(actionData.errors);
		}
	}, [actionData]);

	const handleCloseDialog = () => {
		setIsDialogOpen(false);
		setErrors({});
	};

	const navSettings = <NavSettings ctx={ctx} userRole={loaderData.userRole} />;

	return (
		<MainContainer
			title={ctx.t({ code: "nav.system_settings", msg: "System settings" })}
			headerExtra={navSettings}
		>
			<Toast ref={toast} />
			<div className="mg-container">
				<div className="dts-page-intro">
					<div className="dts-additional-actions">
						<Button
							type="button"
							icon="pi pi-pencil"
							label={ctx.t({
								code: "settings.system.edit_settings",
								msg: "Edit Settings",
							})}
							onClick={() => showEditSettings()}>
						</Button>
					</div>
				</div>

				<div className="flex flex-col gap-6">

					{/* Country Instance */}
					<section className="border border-gray-200 rounded-lg overflow-hidden">
						<div className="flex items-center gap-2 bg-gray-50 border-b border-gray-200 px-5 py-3">
							<i className="pi pi-globe text-[#004F91]" />
							<span className="font-semibold text-gray-700">
								{ctx.t({ code: "common.country_instance", msg: "Country instance" })}
							</span>
						</div>
						<dl className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
							{[
								{
									label: ctx.t({ code: "common.country", msg: "Country" }),
									value: loaderData.country?.name,
								},
								{
									label: ctx.t({ code: "common.type", msg: "Type" }),
									value: loaderData.countryAccountType ? `${loaderData.countryAccountType} instance` : undefined,
								},
								{
									label: ctx.t({ code: "settings.system.iso_3", msg: "ISO 3" }),
									value: loaderData.instanceSystemSettings?.dtsInstanceCtryIso3,
								},
								{
									label: ctx.t({ code: "settings.system.instance_type", msg: "Instance type" }),
									value: loaderData.instanceSystemSettings?.approvedRecordsArePublic
										? ctx.t({ code: "common.public", msg: "Public" })
										: ctx.t({ code: "common.private", msg: "Private" }),
								},
								{
									label: ctx.t({ code: "common.language", msg: "Language" }),
									value: loaderData.instanceSystemSettings?.language,
								},
								{
									label: ctx.t({ code: "common.currency", msg: "Currency" }),
									value: loaderData.instanceSystemSettings?.currencyCode,
								},
							].map(({ label, value }) => (
								<div key={label} className="flex flex-col gap-1 px-5 py-4">
									<dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
									<dd className="text-sm font-semibold text-gray-900">{value ?? <span className="text-gray-400 font-normal">—</span>}</dd>
								</div>
							))}
						</dl>
					</section>

					{/* Instance configuration */}
					<section className="border border-gray-200 rounded-lg overflow-hidden">
						<div className="flex items-center gap-2 bg-gray-50 border-b border-gray-200 px-5 py-3">
							<i className="pi pi-cog text-[#004F91]" />
							<span className="font-semibold text-gray-700">
								{ctx.t({ code: "settings.system.instance_configuration", msg: "Instance configuration" })}
							</span>
						</div>
						<dl className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
							{[
								{
									label: ctx.t({ code: "settings.system.instance_name", msg: "Instance Name" }),
									value: loaderData.instanceSystemSettings?.websiteName,
								},
								{
									label: ctx.t({ code: "settings.system.application_url", msg: "Application URL" }),
									value: loaderData.publicURL,
								},
								{
									label: ctx.t({ code: "settings.system.instance_logo_url", msg: "Instance Logo URL" }),
									value: loaderData.instanceSystemSettings?.websiteLogo,
								},
								{
									label: ctx.t({ code: "settings.system.2fa_totp_issuer_name", msg: "2FA/TOTP Issuer Name" }),
									value: loaderData.instanceSystemSettings?.totpIssuer,
								},
								{
									label: ctx.t({ code: "settings.system.page_footer_privacy_policy_url", msg: "Privacy Policy URL" }),
									value: loaderData.instanceSystemSettings?.footerUrlPrivacyPolicy,
								},
								{
									label: ctx.t({ code: "settings.system.page_footer_terms_and_conditions_url", msg: "Terms & Conditions URL" }),
									value: loaderData.instanceSystemSettings?.footerUrlTermsConditions,
								},
							].map(({ label, value }) => (
								<div key={label} className="flex flex-col gap-1 px-5 py-4">
									<dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
									<dd className="text-sm font-semibold text-gray-900 break-all">{value ?? <span className="text-gray-400 font-normal">—</span>}</dd>
								</div>
							))}
						</dl>
					</section>

					{/* Software & Email */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">

						{/* Software version */}
						<section className="border border-gray-200 rounded-lg overflow-hidden">
							<div className="flex items-center gap-2 bg-gray-50 border-b border-gray-200 px-5 py-3">
								<i className="pi pi-info-circle text-[#004F91]" />
								<span className="font-semibold text-gray-700">
									{ctx.t({ code: "settings.system.software", msg: "Software" })}
								</span>
							</div>
							<div className="flex flex-col gap-1 px-5 py-4">
								<dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
									{ctx.t({ code: "settings.system.delta_resilience_software_application_version", msg: "DELTA Resilience version" })}
								</dt>
								<dd className="text-sm font-semibold text-gray-900">
									{loaderData.dtsSystemInfo?.versionNo ?? <span className="text-gray-400 font-normal">—</span>}
								</dd>
							</div>
						</section>

						{/* Email routing */}
						<section className="border border-gray-200 rounded-lg overflow-hidden">
							<div className="flex items-center gap-2 bg-gray-50 border-b border-gray-200 px-5 py-3">
								<i className="pi pi-envelope text-[#004F91]" />
								<span className="font-semibold text-gray-700">
									{ctx.t({ code: "settings.system.system_email_routing_configuration", msg: "Email routing" })}
								</span>
							</div>
							<dl className="divide-y divide-gray-100">
								{[
									{
										label: ctx.t({ code: "settings.system.transport", msg: "Transport" }),
										value: loaderData.confEmailObj.EMAIL_TRANSPORT,
									},
									...(loaderData.confEmailObj.EMAIL_TRANSPORT === "smtp" ? [
										{
											label: ctx.t({ code: "settings.system.host", msg: "Host" }),
											value: loaderData.confEmailObj.SMTP_HOST ?? "Not set",
										},
										{
											label: ctx.t({ code: "settings.system.port", msg: "Port" }),
											value: loaderData.confEmailObj.SMTP_PORT ?? "Not set",
										},
										{
											label: ctx.t({ code: "settings.system.secure", msg: "Secure" }),
											value: loaderData.confEmailObj.SMTP_SECURE
												? ctx.t({ code: "common.yes", msg: "Yes" })
												: ctx.t({ code: "common.no", msg: "No" }),
										},
									] : []),
								].map(({ label, value }) => (
									<div key={label} className="flex flex-col gap-1 px-5 py-4">
										<dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
										<dd className="text-sm font-semibold text-gray-900">{value ?? <span className="text-gray-400 font-normal">—</span>}</dd>
									</div>
								))}
							</dl>
						</section>

					</div>
				</div>

				{/* dialog for editing system variables */}
				<Dialog
					header={ctx.t({
						code: "settings.system.edit_settings",
						msg: "Edit Settings",
					})}
					visible={isDialogOpen}
					onHide={handleCloseDialog}
					modal
					className="w-[32rem] max-w-full"
				>
					<Form method="post" id="addCountryAccountForm" ref={formRef}>
						<input
							type="hidden"
							name="id"
							value={loaderData.instanceSystemSettings?.id || ""}
						/>

						<div className="space-y-4">

							{/* Required fields notice */}
							<div className="text-sm text-red-600">
								{`* ${ctx.t({
									code: "common.required_information",
									msg: "Required information",
								})}`}
							</div>

							{/* Language */}
							<div className="flex flex-col gap-1">
								<label className="font-semibold">
									{ctx.t({ code: "common.language", msg: "Language" })}
									<span className="text-red-500 ml-1">*</span>
								</label>

								<Dropdown
									name="language"
									value={language}
									options={loaderData.availableLanguages}
									onChange={(e) => setLanguage(e.value)}
									className="w-full"
									invalid={!!errors.language}
								/>

								{errors.language && (
									<small className="text-red-500">{errors.language}</small>
								)}
							</div>

							{/* Privacy URL */}
							<div className="flex flex-col gap-1">
								<label className="font-semibold">
									{ctx.t({
										code: "settings.system.privacy_policy_url",
										msg: "Privacy Policy URL",
									})}
								</label>

								<InputText
									name="privacyUrl"
									value={privacyUrl}
									onChange={(e) => setPrivacyUrl(e.target.value)}
									placeholder="https://example.com/privacy"
									invalid={!!errors.privacyUrl}
								/>

								{errors.privacyUrl && (
									<small className="text-red-500">{errors.privacyUrl}</small>
								)}
							</div>

							{/* Terms URL */}
							<div className="flex flex-col gap-1">
								<label className="font-semibold">
									{ctx.t({
										code: "settings.system.terms_and_conditions_url",
										msg: "Terms and Conditions URL",
									})}
								</label>

								<InputText
									name="termsUrl"
									value={termsUrl}
									onChange={(e) => setTermsUrl(e.target.value)}
									placeholder="https://example.com/terms"
									invalid={!!errors.termsUrl}
								/>

								{errors.termsUrl && (
									<small className="text-red-500">{errors.termsUrl}</small>
								)}
							</div>

							{/* Logo URL */}
							<div className="flex flex-col gap-1">
								<label className="font-semibold">
									{ctx.t({
										code: "settings.system.website_logo_url",
										msg: "Website Logo URL",
									})}
									<span className="text-red-500 ml-1">*</span>
								</label>

								<InputText
									name="websiteLogoUrl"
									value={websiteLogoUrl}
									onChange={(e) => setWebsiteLogoUrl(e.target.value)}
									placeholder="https://example.com/logo.svg"
									invalid={!!errors.websiteLogoUrl}
								/>

								{errors.websiteLogoUrl && (
									<small className="text-red-500">
										{errors.websiteLogoUrl}
									</small>
								)}
							</div>

							{/* Website name */}
							<div className="flex flex-col gap-1">
								<label className="font-semibold">
									{ctx.t({
										code: "settings.system.website_name",
										msg: "Website Name",
									})}
									<span className="text-red-500 ml-1">*</span>
								</label>

								<InputText
									name="websiteName"
									value={websiteName}
									onChange={(e) => setWebsiteName(e.target.value)}
									placeholder="Enter website name"
									invalid={!!errors.websiteName}
								/>

								{errors.websiteName && (
									<small className="text-red-500">{errors.websiteName}</small>
								)}
							</div>

							{/* Visibility */}
							<div className="flex flex-col gap-1">
								<label className="font-semibold">
									{ctx.t({
										code: "settings.system.approved_records_visibility",
										msg: "Approved records visibility",
									})}
									<span className="text-red-500 ml-1">*</span>
								</label>

								<Dropdown
									name="approvedRecordsArePublic"
									value={approvedRecordsArePublic ? "true" : "false"}
									options={[
										{
											label: ctx.t({ code: "common.public", msg: "Public" }),
											value: "true",
										},
										{
											label: ctx.t({ code: "common.private", msg: "Private" }),
											value: "false",
										},
									]}
									onChange={(e) =>
										setApprovedRecordsArePublic(e.value === "true")
									}
									invalid={!!errors.approvedRecordsArePublic}
								/>

								{errors.approvedRecordsArePublic && (
									<small className="text-red-500">
										{errors.approvedRecordsArePublic}
									</small>
								)}
							</div>

							{/* Currency */}
							<div className="flex flex-col gap-1">
								<label className="font-semibold">
									{ctx.t({ code: "common.currency", msg: "Currency" })}
									<span className="text-red-500 ml-1">*</span>
								</label>

								<Dropdown
									name="currency"
									value={currency}
									options={getCurrencyList()}
									onChange={(e) => setCurrency(e.value)}
									invalid={!!errors.currency}
								/>

								{errors.currency && (
									<small className="text-red-500">{errors.currency}</small>
								)}
							</div>

							{/* TOTP Issuer */}
							<div className="flex flex-col gap-1">
								<label className="font-semibold">
									{ctx.t({
										code: "settings.system.totp_issuer",
										msg: "Totp Issuer",
									})}
									<span className="text-red-500 ml-1">*</span>
								</label>

								<InputText
									name="totpIssuer"
									value={totpIssuer}
									onChange={(e) => setTotpIssuer(e.target.value)}
									placeholder="Enter Totp Issuer"
									invalid={!!errors.totpIssuer}
								/>

								{errors.totpIssuer && (
									<small className="text-red-500">
										{errors.totpIssuer}
									</small>
								)}
							</div>
						</div>

						{/* Footer */}
						<div className="flex justify-end gap-2 mt-6">
							<Button
								label={ctx.t({ code: "common.cancel", msg: "Cancel" })}
								outlined
								type="button"
								onClick={handleCloseDialog}
							/>

							<Button
								label={ctx.t({ code: "common.save", msg: "Save" })}
								type="submit"
								icon="pi pi-check"
							/>
						</div>
					</Form>
				</Dialog>
			</div>
		</MainContainer>
	);
}
