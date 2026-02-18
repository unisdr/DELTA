import { MetaFunction } from "react-router";

import {
	authLoaderGetAuth,
	authActionWithPerm,
	authLoaderWithPerm,
	authActionGetAuth,
} from "~/utils/auth";

import { useLoaderData } from "react-router";

import { sendEmail } from "~/utils/email";

import { getInstanceSystemSettingsByCountryAccountId } from "~/db/queries/instanceSystemSetting";
import {
	getCountryAccountsIdFromSession,
	getCountrySettingsFromSession,
} from "~/utils/session";
import { redirectLangFromRoute } from "~/utils/url.backend";
import { ViewContext } from "~/frontend/context";

import { BackendContext } from "~/backend.server/context";
import { getLanguageAllowDefault } from "~/utils/lang.backend";
import { urlLang } from "~/utils/url";

export const meta: MetaFunction = (args) => {
	// Extract the query string
	const queryString = args.location.search;

	// Parse the query string using URLSearchParams
	const params = new URLSearchParams(queryString) || "";

	// Access the individual query parameters
	const step = params.get("step") || "";
	let intStep: number = 0;

	if (typeof step == "string" && (step == "" || step == "0")) {
		intStep = 1;
	} else if (
		typeof step == "string" &&
		parseInt(step) >= 1 &&
		parseInt(step) <= 4
	) {
		intStep = parseInt(step);
		intStep++;
	} else if (typeof step == "string" && parseInt(step) >= 5) {
		intStep = 5;
	}

	const lang = getLanguageAllowDefault(args);
	const u = urlLang(lang, `/user/verify-email-complete?step=${intStep}`);

	return [
		{
			httpEquiv: "refresh",
			content: `10; URL='${u}'`,
		},
	];
};

export const action = authActionWithPerm("ViewUsers", async (actionArgs) => {
	const { request } = actionArgs;
	const ctx = new BackendContext(actionArgs);
	const { user } = authActionGetAuth(actionArgs);

	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	const settings =
		await getInstanceSystemSettingsByCountryAccountId(countryAccountsId);
	if (!settings) {
		throw new Response("System settings cannot be found.", { status: 500 });
	}

	var countryName = "";
	if (settings) {
		countryName = settings.countryName;
	}

	//Send confirmation email
	const subject = ctx.t(
		{
			code: "email.welcome.subject",
			msg: "Welcome to DELTA Resilience {websiteName}",
		},
		{
			websiteName: settings.websiteName,
		},
	);

	const html = ctx.t(
		{
			code: "email.welcome.html_body",
			desc: "HTML version of the user welcome email.",
			msg: [
				"<p>Dear {firstName} {lastName},</p>",
				"<p>Welcome to the DELTA Resilience {countryName} system. Your user account has been successfully created.</p>",
				"<p>Click the link below to access your account:</p>",
				'<p><a href="{accountUrl}" style="display: inline-block; padding: 10px 20px; font-size: 16px; color: #ffffff; background-color: #007BFF; text-decoration: none; border-radius: 5px;">Access My Account</a></p>',
				'<p>If the button above does not work, copy and paste the following URL into your browser:<br><a href="{accountUrl}">{accountUrl}</a></p>',
			],
		},
		{
			firstName: user.firstName,
			lastName: user.lastName,
			countryName: countryName,
			accountUrl: ctx.fullUrl("/settings/access-mgmnt"),
		},
	);

	const text = ctx.t(
		{
			code: "email.welcome.text_body",
			desc: "Text version of the user welcome email.",
			msg: [
				"Dear {firstName} {lastName}",
				"Welcome to the DELTA Resilience {countryName} system. Your user account has been successfully created.",
				"Copy and paste the following link into your browser URL to access your account:{accountUrl}",
			],
		},
		{
			firstName: user.firstName,
			lastName: user.lastName,
			countryName: countryName,
			accountUrl: ctx.fullUrl("/settings/access-mgmnt"),
		},
	);

	await sendEmail(user.email, subject, text, html);

	return redirectLangFromRoute(actionArgs, "/settings/access-mgmnt");
});

export const loader = authLoaderWithPerm("ViewUsers", async (loaderArgs) => {
	authLoaderGetAuth(loaderArgs);
	const url = new URL(loaderArgs.request.url);
	let qsStep = url.searchParams.get("step") || "";

	var siteName = "DELTA Resilience";
	const settings = await getCountrySettingsFromSession(loaderArgs.request);
	if (settings) {
		siteName = settings.websiteName;
	}
	return {
		configSiteName: siteName,
		qsStep: qsStep,
	};
});

export default function Data() {
	const pageData = useLoaderData<typeof loader>();
	const ctx = new ViewContext();
	let isSubmitting = false;

	return (
		<div className="dts-page-container">
			<main className="dts-main-container">
				<div className="mg-container">
					<form
						action={ctx.url("/user/verify-email-complete?step=5")}
						className="dts-form dts-form--vertical"
						method="post"
					>
						<div className="dts-form__header">
							<span>&nbsp;</span>
						</div>
						<div className="dts-form__intro">
							<div className="dts-form__additional-content dts-form__additional-content--centered">
								{pageData.qsStep &&
									(parseInt(pageData.qsStep) < 5 || pageData.qsStep == "") && (
										<>
											<h1 className="dts-heading-1">
												{ctx.t(
													{
														code: "users.welcome_to_site",
														msg: "Welcome to {siteName}",
													},
													{ siteName: pageData.configSiteName },
												)}
											</h1>
											<div>
												{ctx.t({
													code: "users.setting_up_system",
													msg: "Setting up the system.",
												})}
											</div>
											<div>
												{ctx.t({
													code: "users.do_not_close_window",
													msg: "Do not close this window. This can take a while.",
												})}
											</div>
										</>
									)}

								{pageData.qsStep && parseInt(pageData.qsStep) == 5 && (
									<>
										<h1 className="dts-heading-1">
											{ctx.t({
												code: "users.system_setup_complete",
												msg: "System setup complete",
											})}
										</h1>
										<div>
											{ctx.t({
												code: "users.click_button_below_to_continue",
												msg: "Click the button below to continue.",
											})}
										</div>
									</>
								)}
							</div>
						</div>
						<div className="dts-form__body">
							<div className="dts-form-component">
								{pageData.qsStep &&
									parseInt(pageData.qsStep) >= 0 &&
									parseInt(pageData.qsStep) < 5 && (
										<p>
											{"1 of 4: " +
												ctx.t({
													code: "users.installing_assets_taxonomy_step",
													msg: "Installing assets taxonomy",
												}) +
												" "}
											{parseInt(pageData.qsStep) >= 1 ? (
												<>
													{ctx
														.t({
															code: "common.complete",
															msg: "Complete",
														})
														.toLowerCase()}
												</>
											) : (
												<>
													{ctx
														.t({
															code: "common.starting",
															msg: "Starting",
														})
														.toLowerCase()}
												</>
											)}
										</p>
									)}
								{pageData.qsStep &&
									parseInt(pageData.qsStep) >= 1 &&
									parseInt(pageData.qsStep) < 5 && (
										<p>
											{"2 of 4: " +
												ctx.t({
													code: "common.installing_categories_taxonomy",
													msg: "Installing categories taxonomy",
												})}{" "}
											{parseInt(pageData.qsStep) >= 2 ? (
												<>
													{ctx
														.t({
															code: "common.complete",
															msg: "Complete",
														})
														.toLowerCase()}
												</>
											) : (
												<>
													{ctx
														.t({
															code: "common.starting",
															msg: "Starting",
														})
														.toLowerCase()}
												</>
											)}
										</p>
									)}
								{pageData.qsStep &&
									parseInt(pageData.qsStep) >= 2 &&
									parseInt(pageData.qsStep) < 5 && (
										<p>
											{"3 of 4: " +
												ctx.t({
													code: "common.installing_hazard_information_profile_taxonomy",
													msg: "Installing hazard information profile taxonomy",
												})}{" "}
											{parseInt(pageData.qsStep) >= 3 ? (
												<>
													{ctx
														.t({
															code: "common.complete",
															msg: "Complete",
														})
														.toLowerCase()}
												</>
											) : (
												<>
													{ctx
														.t({
															code: "common.starting",
															msg: "Starting",
														})
														.toLowerCase()}
												</>
											)}
										</p>
									)}
								{pageData.qsStep &&
									parseInt(pageData.qsStep) >= 3 &&
									parseInt(pageData.qsStep) < 5 && (
										<p>
											{"4 of 4: " +
												ctx.t({
													code: "common.installing_sectors_taxonomy",
													msg: "Installing sectors taxonomy",
												})}{" "}
											{parseInt(pageData.qsStep) >= 4 ? (
												<>
													{ctx
														.t({
															code: "common.complete",
															msg: "Complete",
														})
														.toLowerCase()}
												</>
											) : (
												<>
													{ctx
														.t({
															code: "common.starting",
															msg: "Starting",
														})
														.toLowerCase()}
												</>
											)}
										</p>
									)}
							</div>
						</div>
						{pageData.qsStep && parseInt(pageData.qsStep) == 5 && (
							<div className="dts-form__actions">
								<button
									type="submit"
									className="mg-button mg-button-primary"
									disabled={
										typeof window !== "undefined" ? isSubmitting : undefined
									}
								>
									{ctx.t({
										code: "common.get_started",
										msg: "Get started",
									})}
								</button>
							</div>
						)}
					</form>
				</div>
			</main>
		</div>
	);
}
