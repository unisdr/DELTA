import type { MetaFunction } from "react-router";

import { ActionFunctionArgs, LoaderFunctionArgs, redirect } from "react-router";
import { useLoaderData, useActionData } from "react-router";
import { useEffect } from "react";
import {
	Form,
	Field,
	Errors as FormErrors,
	SubmitButton,
	validateFormAndToggleSubmitButton,
	errorToString,
} from "~/frontend/form";
import { formStringData } from "~/utils/httputil";
import {
	createSuperAdminSession,
	getSuperAdminSession,
	sessionCookie,
} from "~/utils/session";
import { superAdminLogin } from "~/backend.server/models/user/auth";
import {
	configAuthSupportedAzureSSOB2C,
	configAuthSupportedForm,
	configIsPublicUrlValid,
} from "~/utils/config";
import PasswordInput from "~/components/PasswordInput";
import Messages from "~/components/Messages";
// import { testDbConnection } from "~/db.server";
import { FaExclamationTriangle } from "react-icons/fa";
import { createCSRFToken } from "~/backend.server/utils/csrf";
import { urlLang } from "~/utils/url";
import { getLanguage } from "~/utils/lang.backend";

import { ViewContext } from "~/frontend/context";


import { LangLink } from "~/utils/link";
import { BackendContext } from "~/backend.server/context";
import { htmlTitle } from "~/utils/htmlmeta";

interface LoginFields {
	email: string;
	password: string;
}
type LoginActionData =
	| {
		data: LoginFields;
		errors: FormErrors<LoginFields>;
	}
	| undefined;

type LoginLoaderData = {
	redirectTo: string;
	csrfToken: string;
	isFormAuthSupported: boolean;
	isSSOAuthSupported: boolean;
	configErrors: { variable: string; message: string }[];
};

export const action = async (actionArgs: ActionFunctionArgs) => {
	const ctx = new BackendContext(actionArgs);
	const { request } = actionArgs

	// Check if form authentication is supported
	if (!configAuthSupportedForm()) {
		return Response.json(
			{
				data: {},
				errors: {
					general: [
						"Form-based authentication is not available. Please use SSO.",
					],
				},
			},
			{ status: 400 }
		);
	}

	const formData = formStringData(await request.formData());
	const data: LoginFields = {
		email: formData.email || "",
		password: formData.password || "",
	};

	const cookieHeader = request.headers.get("Cookie") || "";
	const sessionCurrent = await sessionCookie().getSession(cookieHeader);

	if (formData.csrfToken !== sessionCurrent.get("csrfToken")) {
		return Response.json(
			{
				data,
				errors: {
					general: [
						"CSRF validation failed. Please ensure you're submitting the form from a valid session. For your security, please restart your browser and try again.",
					],
				},
			},
			{ status: 400 }
		);
	}

	const res = await superAdminLogin(data.email, data.password);
	if (!res.ok) {
		let errors: FormErrors<LoginFields> = {
			fields: {
				email: [
					ctx.t({
						"code": "admin.email_password_dont_match",
						"msg": "Email or password do not match"
					})
				],
				password: [
					ctx.t({
						"code": "admin.email_password_dont_match",
						"msg": "Email or password do not match"
					})
				],
			},
		};
		return Response.json({ data, errors }, { status: 400 });
	}

	const headers = await createSuperAdminSession(res.superAdminId);

	const url = new URL(request.url);
	let redirectTo = url.searchParams.get("redirectTo");

	redirectTo = getSafeRedirectTo(ctx.lang, redirectTo, "/admin/country-accounts");
	return redirect(redirectTo, { headers });
};

// Function to validate required environment variables
function validateRequiredEnvVars(ctx: BackendContext) {
	const errors: { variable: string; message: string }[] = [];

	// Check DATABASE_URL
	if (!process.env.DATABASE_URL) {
		errors.push({
			variable: "DATABASE_URL",
			message: ctx.t({
				"code": "admin.db_connection_string_missing",
				"msg": "Database connection string is missing"
			}),
		});
	} else if (!process.env.DATABASE_URL.startsWith("postgresql://")) {
		errors.push({
			variable: "DATABASE_URL",
			message: "Database connection string is invalid (must be PostgreSQL)",
		});
	}

	// Check if the database URL contains invalid characters or paths
	/*
	TODO: this check is invalid 
	breaks this working url
	postgresql://u@localhost/db?host=/var/run/postgresql/&schema=public"
	if (
		process.env.DATABASE_URL &&
		process.env.DATABASE_URL.includes("?host=/var/run/postgresql/")
	) {
		errors.push({
			variable: "DATABASE_URL",
			message:
				"Database connection string contains invalid Unix socket path. Please use a standard PostgreSQL connection string format.",
		});
	}*/

	// Check SESSION_SECRET
	if (!process.env.SESSION_SECRET) {
		errors.push({
			variable: "SESSION_SECRET",
			message: "Session secret is missing",
		});
	} else if (
		process.env.NODE_ENV === "production" &&
		process.env.SESSION_SECRET === "not-random-dev-secret"
	) {
		errors.push({
			variable: "SESSION_SECRET",
			message: "Session secret is using default value in production",
		});
	}

	// Check EMAIL_TRANSPORT and related settings
	if (!process.env.EMAIL_TRANSPORT) {
		errors.push({
			variable: "EMAIL_TRANSPORT",
			message: "Email transport configuration is missing",
		});
	} else if (process.env.EMAIL_TRANSPORT === "smtp") {
		// Check required SMTP settings when SMTP transport is selected
		if (!process.env.SMTP_HOST) {
			errors.push({
				variable: "SMTP_HOST",
				message: "SMTP host is required when using SMTP transport",
			});
		}
		if (!process.env.SMTP_PORT) {
			errors.push({
				variable: "SMTP_PORT",
				message: "SMTP port is required when using SMTP transport",
			});
		}
		if (!process.env.SMTP_USER) {
			errors.push({
				variable: "SMTP_USER",
				message: "SMTP username is required when using SMTP transport",
			});
		}
		if (!process.env.SMTP_PASS) {
			errors.push({
				variable: "SMTP_PASS",
				message: "SMTP password is required when using SMTP transport",
			});
		}
	}

	// Check EMAIL_FROM
	if (!process.env.EMAIL_FROM) {
		errors.push({
			variable: "EMAIL_FROM",
			message: "Email sender address is missing",
		});
	} else if (
		!process.env.EMAIL_FROM.includes("@") ||
		!process.env.EMAIL_FROM.includes(".")
	) {
		errors.push({
			variable: "EMAIL_FROM",
			message: "Email sender address appears to be invalid",
		});
	}

	// Check AUTHENTICATION_SUPPORTED
	if (!process.env.AUTHENTICATION_SUPPORTED) {
		errors.push({
			variable: "AUTHENTICATION_SUPPORTED",
			message: "Authentication methods configuration is missing",
		});
	}

	// Check SSO configuration if enabled
	if (configAuthSupportedAzureSSOB2C()) {
		if (!process.env.SSO_AZURE_B2C_TENANT) {
			errors.push({
				variable: "SSO_AZURE_B2C_TENANT",
				message: "Azure B2C tenant is required when SSO is enabled",
			});
		}
		if (!process.env.SSO_AZURE_B2C_CLIENT_ID) {
			errors.push({
				variable: "SSO_AZURE_B2C_CLIENT_ID",
				message: "Azure B2C client ID is required when SSO is enabled",
			});
		}
		if (!process.env.SSO_AZURE_B2C_CLIENT_SECRET) {
			errors.push({
				variable: "SSO_AZURE_B2C_CLIENT_SECRET",
				message: "Azure B2C client secret is required when SSO is enabled",
			});
		}
	}

	let publicUrlRes = configIsPublicUrlValid()
	if (!publicUrlRes.ok) {
		errors.push({
			variable: "PUBLIC_URL",
			message: publicUrlRes.error,
		});
	}

	return errors;
}

export const loader = async (loaderArgs: LoaderFunctionArgs) => {
	const ctx = new BackendContext(loaderArgs);
	const { request } = loaderArgs;
	// Validate required environment variables
	const configErrors = validateRequiredEnvVars(ctx);

	// Add a message about the number of configuration errors
	if (configErrors.length > 0) {
		console.warn(
			`Found ${configErrors.length} configuration errors that need to be fixed before proceeding with setup.`
		);
	}
	// else {
	// 	// Test database connection only if no other config errors

	// 	const boolDbConnectionTest = await testDbConnection();

	// 	// Check #1: Test database connection before proceeding
	// 	if (boolDbConnectionTest === false) {
	// 		console.error('Database connection error');
	// 		configErrors.push({
	// 			variable: 'DATABASE_URL',
	// 			message: 'Could not connect to the database. Please check your connection string.'
	// 		});
	// 	}
	// }

	const superAdminSession = await getSuperAdminSession(request);

	const url = new URL(request.url);
	let redirectTo = url.searchParams.get("redirectTo");
	const lang = getLanguage(loaderArgs)
	redirectTo = getSafeRedirectTo(lang, redirectTo, "/admin/country-accounts");

	const csrfToken = createCSRFToken();

	// Set a session cookie to mark this as an admin login origin
	const session = await sessionCookie().getSession();
	session.set("loginOrigin", "admin");
	session.set("csrfToken", csrfToken);
	const setCookie = await sessionCookie().commitSession(session);

	if (superAdminSession) {
		return Response.json(
			{

				redirectTo,
				isFormAuthSupported: true,
				isSSOAuthSupported: true,
				configErrors: configErrors,
				csrfToken: csrfToken,
			},
			{ headers: { "Set-Cookie": setCookie } }
		);
	}

	const isFormAuthSupported = configAuthSupportedForm();
	const isSSOAuthSupported = configAuthSupportedAzureSSOB2C();

	// If no authentication methods are configured, show error
	if (!isFormAuthSupported && !isSSOAuthSupported) {
		throw new Error(
			"No authentication methods configured. Please check AUTHENTICATION_SUPPORTED environment variable."
		);
	}

	return Response.json(
		{

			redirectTo: redirectTo,
			isFormAuthSupported: isFormAuthSupported,
			isSSOAuthSupported: isSSOAuthSupported,
			configErrors: configErrors,
			csrfToken: csrfToken,
		},
		{ headers: { "Set-Cookie": setCookie } }
	);
};

export function getSafeRedirectTo(
	lang: string,
	redirectTo: string | null,
	defaultPath: string
): string {
	if (redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
		return redirectTo;
	}
	return urlLang(lang, defaultPath);
}

export const meta: MetaFunction = () => {
	const ctx = new ViewContext();

	return [
		{
			title: htmlTitle(ctx, ctx.t({
				"code": "meta.sign_in_super_admin",
				"msg": "Sign-in - Super Admin"
			})),
		},
		{
			name: "description",
			content: ctx.t({
				"code": "meta.login",
				"msg": "Login"
			}),
		}
	];
};

export default function Screen() {
	const loaderData = useLoaderData<LoginLoaderData>();
	const ctx = new ViewContext();
	const actionData = useActionData<LoginActionData>();

	const errors = actionData?.errors || {};
	const data = actionData?.data;

	const { isFormAuthSupported, isSSOAuthSupported, configErrors } = loaderData;

	useEffect(() => {
		// Submit button enabling only when required fields are filled (only if form is supported)
		if (isFormAuthSupported) {
			const submitButton = document.querySelector(
				"[id='login-button']"
			) as HTMLButtonElement;
			if (submitButton) {
				submitButton.disabled = true;
				validateFormAndToggleSubmitButton("login-form", "login-button");
			}
		}
	}, [isFormAuthSupported]);

	if (configErrors && configErrors.length > 0) {
		return (
			<div className="dts-page-container">
				<main className="dts-main-container">
					<div className="mg-container">
						<div className="dts-form dts-form--vertical">
							<div className="dts-form__header"></div>
							<div className="dts-form__body">
								<div
									style={{
										background: "#fff0f0",
										border: "1px solid #ffcccc",
										borderRadius: "4px",
										padding: "16px",
										marginBottom: "20px",
									}}
								>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											marginBottom: "10px",
											color: "#cc0000",
											fontWeight: "bold",
										}}
									>
										<FaExclamationTriangle style={{ marginRight: "8px" }} />
										{ctx.t({
											"code": "admin.system_config_errors",
											"msg": "System configuration errors"
										})}
									</div>
									<p style={{ marginBottom: "10px" }}>
										{ctx.t({
											"code": "admin.required_config_missing_in_env_file",
											"msg": "The following required configuration variables are missing or have invalid values in your {file} file."
										}, { "file": ".env" })}
									</p>
									<ul
										style={{
											listStyleType: "disc",
											paddingLeft: "20px",
											margin: "0",
										}}
									>
										{configErrors.map((error: any, index: number) => (
											<li key={index} style={{ marginBottom: "5px" }}>
												<strong>{error.variable}</strong>: {error.message}
											</li>
										))}
									</ul>
									<p style={{ marginTop: "10px", marginBottom: "0" }}>
										{ctx.t({
											"code": "admin.update_env_file",
											"msg": "Please update your .env file with the correct values before proceeding."
										})}
									</p>
								</div>
							</div>
						</div>
					</div>
				</main>
			</div>
		);
	}

	// If only SSO is supported, show SSO-only interface
	if (!isFormAuthSupported && isSSOAuthSupported) {
		return (
			<div className="dts-page-container">
				<main className="dts-main-container">
					<div className="mg-container">
						<div className="dts-form dts-form--vertical">
							<div className="dts-form__header"></div>
							<div className="dts-form__intro">
								{errors?.general && <Messages messages={errors.general} />}
								<h2 className="dts-heading-1">
									{ctx.t({
										"code": "admin.signin_admin_management",
										"msg": "Sign in - Admin Management"
									})}
								</h2>
								<p>
									{ctx.t({
										"code": "admin.use_sso_for_access",
										"msg": "Use your organization's Single Sign-On to access your admin account."
									})}
								</p>
							</div>
							<div
								className="dts-dialog__form-actions"
								style={{
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									gap: "0.8rem",
									marginTop: "2rem",
								}}
							>
								<LangLink
									lang={ctx.lang}
									className="mg-button mg-button-primary"
									to="/sso/azure-b2c/login?origin=admin&redirectTo=/admin/country-accounts&isAdmin=true&adminLogin=1"
									style={{
										width: "100%",
										padding: "10px 20px",
										textAlign: "center",
										textDecoration: "none",
									}}
								>
									{ctx.t({
										"code": "admin.signin_with_azure_b2c_sso",
										"msg": "Sign in with Azure B2C SSO"
									})}
								</LangLink>
							</div>
						</div>
					</div>
				</main>
			</div>
		);
	}

	// If only form is supported, show form-only interface
	if (isFormAuthSupported && !isSSOAuthSupported) {
		return (
			<div className="dts-page-container">
				<main className="dts-main-container">
					<div className="mg-container">
						<Form ctx={ctx}
							id="login-form"
							className="dts-form dts-form--vertical"
							errors={errors}
						>
							<input
								type="hidden"
								name="redirectTo"
								value={loaderData.redirectTo}
							/>
							<input
								type="hidden"
								name="csrfToken"
								value={loaderData.csrfToken}
							/>
							<div className="dts-form__header"></div>
							<div className="dts-form__intro">
								{errors.general && <Messages messages={errors.general} />}
								<h2 className="dts-heading-1">
									{ctx.t({
										"code": "admin.signin_admin_management",
										"msg": "Sign in - Admin Management"
									})}
								</h2>
								<p>
									{ctx.t({
										"code": "admin.signin_enter_credentials_to_access_panel",
										"msg": "Enter your admin credentials to access the management panel."
									})}
								</p>
								<p style={{ marginBottom: "2px" }}>{
									"* " + ctx.t({
										"code": "admin.required_information",
										"msg": "Required information"
									})}
								</p>
							</div>

							<div className="dts-form__body" style={{ marginBottom: "5px" }}>
								<div
									className="dts-form-component"
									style={{ marginBottom: "10px" }}
								>
									<Field label="">
										<span className="mg-u-sr-only">
											{ctx.t({
												"code": "admin.email_address_label",
												"msg": "Email address"
											}) + "*"}
										</span>
										<input
											type="email"
											autoComplete="off"
											name="email"
											placeholder={"* " + ctx.t({
												"code": "admin.email_address_placeholder",
												"msg": "Email address"
											})}
											defaultValue={data?.email}
											required
											className={
												errors?.fields?.email && errors.fields.email.length > 0
													? "input-error"
													: "input-normal"
											}
											style={{
												paddingInlineEnd: "2.5rem",
												width: "100%",
											}}
										/>
									</Field>
								</div>
								<div className="dts-form-component">
									<Field label="">
										<PasswordInput
											name="password"
											placeholder={"* " + ctx.t({
												"code": "admin.password_placeholder",
												"msg": "Password"
											})}
											defaultValue={data?.password}
											errors={errors}
											required={true}
										/>
										{errors?.fields?.password && (
											<div className="dts-form-component__hint--error">
												{errorToString(errors.fields.password[0])}
											</div>
										)}
									</Field>
								</div>
							</div>
							<div
								className="dts-dialog__form-actions"
								style={{
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									gap: "0.8rem",
									marginTop: "2rem",
								}}
							>
								<SubmitButton
									className="mg-button mg-button-primary"
									label={ctx.t({
										"code": "common.signin",
										"msg": "Sign in"
									})}
									id="login-button"
									style={{
										width: "100%",
										padding: "10px 20px",
										marginBottom: "10px",
									}}
								/>
							</div>
						</Form>
					</div>
				</main>
			</div>
		);
	}

	// If both form and SSO are supported, show both options
	if (isFormAuthSupported && isSSOAuthSupported) {
		return (
			<div className="dts-page-container">
				<main className="dts-main-container">
					<div className="mg-container">
						<Form
							ctx={ctx}
							id="login-form"
							className="dts-form dts-form--vertical"
							errors={errors}
						>
							<input
								type="hidden"
								name="redirectTo"
								value={loaderData.redirectTo}
							/>
							<input
								type="hidden"
								name="csrfToken"
								value={loaderData.csrfToken}
							/>
							<div className="dts-form__header"></div>
							<div className="dts-form__intro">
								{errors.general && <Messages messages={errors.general} />}
								<h2 className="dts-heading-1">
									{ctx.t({
										"code": "admin.signin_admin_management",
										"msg": "Sign in - Admin Management"
									})}
								</h2>
								<p>
									{ctx.t({
										"code": "admin.signin_enter_credentials_or_use_sso",
										"msg": "Enter your admin credentials or use SSO to access the management panel."
									})}
								</p>
								<p style={{ marginBottom: "2px" }}>
									{"* " + ctx.t({
										"code": "admin.required_information",
										"msg": "Required information"
									})}
								</p>
							</div>
							<div className="dts-form__body" style={{ marginBottom: "5px" }}>
								<div
									className="dts-form-component"
									style={{ marginBottom: "10px" }}
								>
									<Field label="">
										<span className="mg-u-sr-only">
											{ctx.t({
												"code": "admin.email_address_label",
												"msg": "Email address"
											}) + "*"}
										</span>
										<input
											type="email"
											autoComplete="off"
											name="email"
											placeholder={"* " + ctx.t({
												"code": "admin.email_address_placeholder",
												"msg": "Email address"
											})}
											defaultValue={data?.email}
											required
											className={
												errors?.fields?.email && errors.fields.email.length > 0
													? "input-error"
													: "input-normal"
											}
											style={{
												paddingInlineEnd: "2.5rem",
												width: "100%",
											}}
										/>
									</Field>
								</div>
								<div className="dts-form-component">
									<Field label="">
										<PasswordInput
											name="password"
											placeholder={"* " + ctx.t({
												"code": "admin.password_placeholder",
												"msg": "Password"
											})}
											defaultValue={data?.password}
											errors={errors}
											required={true}
										/>
										{errors?.fields?.password && (
											<div className="dts-form-component__hint--error">
												{errorToString(errors.fields.password[0])}
											</div>
										)}
									</Field>
								</div>
							</div>
							<div
								className="dts-dialog__form-actions"
								style={{
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									gap: "0.8rem",
									marginTop: "2rem",
								}}
							>
								<SubmitButton
									className="mg-button mg-button-primary"
									label={ctx.t({
										"code": "common.signin",
										"msg": "Sign in"
									})}
									id="login-button"
									style={{
										width: "100%",
										padding: "10px 20px",
										marginBottom: "10px",
									}}
								/>

								{/* Divider */}
								<div
									style={{
										width: "100%",
										textAlign: "center",
										margin: "10px 0",
										position: "relative",
									}}
								>
									<hr
										style={{
											border: "none",
											borderTop: "1px solid #ccc",
											margin: "0",
										}}
									/>
									<span
										style={{
											position: "absolute",
											top: "-10px",
											left: "50%",
											transform: "translateX(-50%)",
											backgroundColor: "white",
											padding: "0 15px",
											color: "#666",
											fontSize: "14px",
										}}
									>
										{ctx.t({
											"code": "common.or",
											"msg": "Or"
										}).toUpperCase()}
									</span>
								</div>

								<LangLink
									lang={ctx.lang}
									className="mg-button mg-button-outline"
									to="/sso/azure-b2c/login?origin=admin&redirectTo=/admin/country-accounts&isAdmin=true&adminLogin=1"
									style={{
										width: "100%",
										padding: "10px 20px",
										textAlign: "center",
										textDecoration: "none",
									}}
								>
									{ctx.t({
										"code": "admin.signin_with_azure_b2c_sso",
										"msg": "Sign in with Azure B2C SSO"
									})}
								</LangLink>
							</div>
						</Form>
					</div>
				</main>
			</div>
		);
	}

	// Fallback - should not reach here if configuration is correct
	return (
		<div className="dts-page-container">
			<main className="dts-main-container">
				<div className="mg-container">
					<div className="dts-form dts-form--vertical">
						<div className="dts-form__intro">
							<h2 className="dts-heading-1">Authentication Not Available</h2>
							<p>
								No valid authentication methods are configured. Please contact
								your system administrator.
							</p>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
