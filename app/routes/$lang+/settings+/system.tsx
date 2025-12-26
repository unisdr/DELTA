import type {
	ActionFunction,
	MetaFunction,
} from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
import { authLoaderWithPerm } from "~/util/auth";
import { configApplicationEmail, configPublicUrl } from "~/util/config";
import { NavSettings } from "~/routes/$lang+/settings/nav";
import { MainContainer } from "~/frontend/container";
import { getSystemInfo } from "~/db/queries/dtsSystemInfo";

import { getInstanceSystemSettingsByCountryAccountId } from "~/db/queries/instanceSystemSetting";
import Dialog from "~/components/Dialog";
import { getCountryAccountsIdFromSession } from "~/util/session";
import { getCountryAccountById } from "~/db/queries/countryAccounts";
import { getCountryById } from "~/db/queries/countries";
import {
	SettingsValidationError,
	updateSettingsService,
} from "~/services/settingsService";
import Messages from "~/components/Messages";
import { Toast, ToastRef } from "~/components/Toast";
import { getCurrencyList } from "~/util/currency";
import { sessionCookie } from "~/util/session";

import { ViewContext } from "~/frontend/context";
import { getCommonData } from "~/backend.server/handlers/commondata";

export const loader = authLoaderWithPerm(
	"ManageCountrySettings",
	async (loaderArgs) => {
		const { request } = loaderArgs;
		const countryAccountsId = await getCountryAccountsIdFromSession(request);

		const settings = await getInstanceSystemSettingsByCountryAccountId(
			countryAccountsId
		);
		const countryAccount = await getCountryAccountById(countryAccountsId);
		let country = null;
		if (countryAccount) {
			country = await getCountryById(countryAccount.countryId);
		}
		const dtsSystemInfo = await getSystemInfo();

		let currencies: string[] = [];
		if (settings) {
			currencies.push(settings.currencyCode);
		}

		const systemLanguage: string[] = ["English"];
		const confEmailObj = configApplicationEmail();

		const session = await sessionCookie().getSession(
			request.headers.get("Cookie")
		);

		const userRole = session.get("userRole");

		return Response.json({
			common: await getCommonData(loaderArgs),
			publicURL: configPublicUrl(),
			currencyArray: currencies,
			systemLanguage,
			confEmailObj,
			instanceSystemSettings: settings,
			dtsSystemInfo,
			country,
			userRole: userRole,
			countryAccountType: countryAccount?.type,
		});
	}
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

		try {
			await updateSettingsService(
				id,
				privacyUrl,
				termsUrl,
				websiteLogoUrl,
				websiteName,
				approvedRecordsArePublic,
				totpIssuer,
				currency
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
	}
);

export const meta: MetaFunction = () => {
	return [
		{ title: "System Settings - DELTA Resilience" },
		{ name: "description", content: "System settings." },
	];
};

export default function Settings() {
	const loaderData = useLoaderData<typeof loader>();
	const ctx = new ViewContext(loaderData);
	const actionData = useActionData<typeof action>();

	const [privacyUrl, setPrivacyUrl] = useState("");
	const [termsUrl, setTermsUrl] = useState("");
	const [websiteLogoUrl, setWebsiteLogoUrl] = useState("");
	const [websiteName, setWebsiteName] = useState("");
	const [approvedRecordsArePublic, setApprovedRecordsArePublic] =
		useState(false);
	const [currency, setCurrency] = useState("");
	const [totpIssuer, setTotpIssuer] = useState("");

	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const toast = useRef<ToastRef>(null);
	const formRef = useRef<HTMLFormElement>(null);
	const footerContent = (
		<>
			<button
				type="submit"
				form="addCountryAccountForm"
				className="mg-button mg-button-primary"
			>
				{ctx.t({"code": "common.save", "msg": "Save"})}
			</button>
			<button
				type="button"
				className="mg-button mg-button-outline"
				onClick={() => setIsDialogOpen(false)}
			>
				{ctx.t({"code": "common.cancel", "msg": "Cancel"})}
			</button>
		</>
	);

	function showEditSettings() {
		if (loaderData.instanceSystemSettings) {
			setPrivacyUrl(
				loaderData.instanceSystemSettings.footerUrlPrivacyPolicy || ""
			);
			setTermsUrl(
				loaderData.instanceSystemSettings.footerUrlTermsConditions || ""
			);
			setWebsiteLogoUrl(loaderData.instanceSystemSettings.websiteLogo || "");
			setWebsiteName(loaderData.instanceSystemSettings.websiteName || "");
			setApprovedRecordsArePublic(
				loaderData.instanceSystemSettings.approvedRecordsArePublic
			);
			setTotpIssuer(loaderData.instanceSystemSettings.totpIssuer || "");
			setCurrency(loaderData.instanceSystemSettings.currencyCode);
		}
		setIsDialogOpen(true);
	}

	useEffect(() => {
		if (actionData?.success) {
			setIsDialogOpen(false);

			if (toast.current) {
				toast.current.show({
					severity: "info",
					summary: ctx.t({"code": "common.success", "msg": "Success"}),
					detail:
						ctx.t({
							"code": "settings.system.updated_successfully", 
							"msg": "System settings updated successfully. Changes will take effect after you login again."
						}),
				});
			}
		}
	}, [actionData]);

	const navSettings = <NavSettings ctx={ctx} userRole={loaderData.userRole} />;

	return (
		<MainContainer title={ctx.t({"code": "nav.system_settings", "msg": "System settings"})} headerExtra={navSettings}>
			<Toast ref={toast} />
			<div className="mg-container">
				<div className="dts-page-intro">
					<div className="dts-additional-actions">
						<button
							type="button"
							className="mg-button mg-button-primary"
							onClick={() => showEditSettings()}
						>
							{ctx.t({"code": "settings.system.edit_settings", "msg": "Edit Settings"})}
						</button>
					</div>
				</div>
				<div className="mg-grid mg-grid__col-3 dts-form-component">
					<label className="dts-form-component__label">
						<strong>{ctx.t({"code": "settings.system.system_language", "msg": "System language"})}</strong>{" "}
						<select
							id="system-language"
							name="systemLanguage"
							className="dts-form-component__select"
						>
							<option disabled value="">
								{ctx.t({"code": "common.select_from_list", "msg": "Select from list"})}
							</option>
							{loaderData.systemLanguage.map((item: string, index: number) => (
								<option key={index} value={item}>
									{item}
								</option>
							))}
						</select>
					</label>
					<label className="dts-form-component__label">
						<strong>{ctx.t({"code": "common.currency", "msg": "Currency"})}</strong>{" "}
						<select
							id="currency"
							name="currency"
							className="dts-form-component__select"
						>
							<option disabled value="">
								{ctx.t({"code": "common.select_from_list", "msg": "Select from list"})}
							</option>
							{loaderData.currencyArray.map((item: string, index: number) => (
								<option key={index} value={item}>
									{item}
								</option>
							))}
						</select>
					</label>
				</div>

				<ul style={{ paddingLeft: 20 }}>
					<li>
						<strong>{ctx.t({"code": "common.country_instance", "msg": "Country instance"})}:</strong>
						<ul>
							<li>
								<strong>{ctx.t({"code": "common.country", "msg": "Country"})}:</strong> {loaderData.country.name}
							</li>
							<li>
								<strong>{ctx.t({"code": "common.type", "msg": "Type"})}:</strong> {loaderData.countryAccountType} instance
							</li>
							<li>
								<strong>{ctx.t({"code": "settings.system.iso_3", "msg": "ISO 3"})}:</strong>{" "}
								{loaderData.instanceSystemSettings?.dtsInstanceCtryIso3}
							</li>
							<li>
								<strong>{ctx.t({"code": "settings.system.instance_type", "msg": "Instance type"})}:</strong>{" "}
								{loaderData.instanceSystemSettings?.approvedRecordsArePublic
									? ctx.t({"code": "common.public", "msg": "Public"})
									: ctx.t({"code": "common.private", "msg": "Private"})}
							</li>
						</ul>
					</li>
					<li>
						<strong>DELTA Resilience software application version:</strong>{" "}
						{loaderData.dtsSystemInfo?.versionNo ?? ""}
					</li>
					<li>
						<strong>{ctx.t({"code": "settings.system.system_email_routing_configuration", "msg": "System email routing configuration"})}:</strong>
						<ul>
							<li>
								<strong>{ctx.t({"code": "settings.system.transport", "msg": "Transport"})}:</strong>{" "}
								{loaderData.confEmailObj.EMAIL_TRANSPORT}
							</li>
							{loaderData.confEmailObj.EMAIL_TRANSPORT === "smtp" && (
								<>
									<li>
										<strong>{ctx.t({"code": "settings.system.host", "msg": "Host"})}:</strong>{" "}
										{loaderData.confEmailObj.SMTP_HOST ?? "Not set"}
									</li>
									<li>
										<strong>{ctx.t({"code": "settings.system.port", "msg": "Port"})}:</strong>{" "}
										{loaderData.confEmailObj.SMTP_PORT ?? "Not set"}
									</li>
									<li>
										<strong>{ctx.t({"code": "settings.system.secure", "msg": "Secure"})}:</strong>{" "}
										{loaderData.confEmailObj.SMTP_SECURE ? ctx.t({"code": "common.yes", "msg": "Yes"}) : ctx.t({"code": "common.no", "msg": "No"})}
									</li>
								</>
							)}
						</ul>
					</li>
					<li>
						<strong>{ctx.t({"code": "settings.system.instance_name", "msg": "Instance Name"})}:</strong>{" "}
						{loaderData.instanceSystemSettings?.websiteName}{" "}
					</li>
					<li>
						<strong>{ctx.t({"code": "settings.system.instance_logo_url", "msg": "Instance Logo URL"})}:</strong>{" "}
						{loaderData.instanceSystemSettings?.websiteLogo}{" "}
					</li>
					<li>
						<strong>{ctx.t({"code": "settings.system.page_footer_privacy_policy_url", "msg": "Page Footer for Privacy Policy URL"})}:</strong>{" "}
						{loaderData.instanceSystemSettings?.footerUrlPrivacyPolicy}{" "}
					</li>
					<li>
						<strong>{ctx.t({"code": "settings.system.page_footer_terms_and_conditions_url", "msg": "Page Footer for Terms and Conditions URL"})}:</strong>{" "}
						{loaderData.instanceSystemSettings?.footerUrlTermsConditions}{" "}
					</li>
					<li>
						<strong>{ctx.t({"code": "settings.system.application_url", "msg": "Application URL"})}:</strong>{" "}
						{loaderData.publicURL}{" "}
					</li>
					<li>
						<strong>{ctx.t({"code": "settings.system.2fa_totp_issuer_name", "msg": "2FA/TOTP Issuer Name"})}:</strong>{" "}
						{loaderData.instanceSystemSettings?.totpIssuer}
					</li>
				</ul>

				{/* dialog for editing system variables */}
				<Dialog
					visible={isDialogOpen}
					header={ctx.t({"code": "settings.system.edit_settings", "msg": "Edit Settings"})}
					onClose={() => setIsDialogOpen(false)}
					footer={footerContent}
				>
					<Form
						method="post"
						id="addCountryAccountForm"
						className="dts-form"
						ref={formRef}
					>
						{actionData?.errors && (
							<Messages header="Errors" messages={actionData.errors} />
						)}
						<div className="dts-form__body">
							<input
								type="hidden"
								name="id"
								value={loaderData.instanceSystemSettings?.id || ""}
							/>
							<div className="dts-form-component">
								<label>
									<div className="dts-form-component__label">
										<span>{ctx.t({"code": "settings.system.privacy_policy_url", "msg": "Privacy Policy URL"})}</span>
									</div>
									<input
										type="url"
										name="privacyUrl"
										aria-label="Privacy URL"
										placeholder="https://example.com/privacy"
										value={privacyUrl}
										onChange={(e) => setPrivacyUrl(e.target.value)}
									></input>
								</label>
							</div>
							<div className="dts-form-component">
								<label>
									<div className="dts-form-component__label">
										<span>{ctx.t({"code": "settings.system.terms_and_conditions_url", "msg": "Terms and Conditions URL"})}</span>
									</div>
									<input
										type="url"
										name="termsUrl"
										aria-label="Terms and Conditions URL"
										placeholder="https://example.com/terms"
										value={termsUrl}
										onChange={(e) => setTermsUrl(e.target.value)}
									></input>
								</label>
							</div>
							<div className="dts-form-component">
								<label>
									<div className="dts-form-component__label">
										<span>* {ctx.t({"code": "settings.system.website_logo_url", "msg": "Website Logo URL"})}</span>
									</div>
									<input
										type="text"
										name="websiteLogoUrl"
										aria-label="Website Logo URL"
										placeholder="https://example.com/logo.svg"
										value={websiteLogoUrl}
										onChange={(e) => setWebsiteLogoUrl(e.target.value)}
									></input>
								</label>
							</div>
							<div className="dts-form-component">
								<label>
									<div className="dts-form-component__label">
										<span>* {ctx.t({"code": "settings.system.website_name", "msg": "Website Name"})}</span>
									</div>
									<input
										type="text"
										name="websiteName"
										aria-label="Website Name"
										placeholder="Enter website name"
										value={websiteName}
										onChange={(e) => setWebsiteName(e.target.value)}
									></input>
								</label>
							</div>
							<div className="dts-form-component">
								<label>
									<div className="dts-form-component__label">
										<span>* {ctx.t({"code": "settings.system.approved_records_visibility", "msg": "Approved records visibility"})}</span>
									</div>
									<select
										name="approvedRecordsArePublic"
										value={approvedRecordsArePublic ? "true" : "false"}
										onChange={(e) => {
											console.log("e.target.value = ", e.target.value);
											console.log(typeof e.target.value);
											setApprovedRecordsArePublic(e.target.value === "true");
										}}
									>
										<option key={1} value="true">
											{ctx.t({"code": "common.public", "msg": "Public"})}
										</option>
										<option key={2} value="false">
											{ctx.t({"code": "common.private", "msg": "Private"})}
										</option>
									</select>
								</label>
							</div>
							<div className="dts-form-component">
								<label>
									<div className="dts-form-component__label">
										<span>* {ctx.t({"code": "common.currency", "msg": "Currency"})}</span>
									</div>
									<select
										name="currency"
										value={currency}
										onChange={(e) => {
											setCurrency(e.target.value);
										}}
									>
										{getCurrencyList().map((currency) => (
											<option key={currency} value={currency}>
												{currency}
											</option>
										))}
									</select>
								</label>
							</div>
							<div className="dts-form-component">
								<label>
									<div className="dts-form-component__label">
										<span>* {ctx.t({"code": "settings.system.totp_issuer", "msg": "Totp Issuer"})}</span>
									</div>
									<input
										type="text"
										name="totpIssuer"
										aria-label="Totp Issuer"
										placeholder="Enter Totp Issuer"
										value={totpIssuer}
										onChange={(e) => setTotpIssuer(e.target.value)}
									></input>
								</label>
							</div>
						</div>
					</Form>
				</Dialog>
			</div>
		</MainContainer>
	);
}
