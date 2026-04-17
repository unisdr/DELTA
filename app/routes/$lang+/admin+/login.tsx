import type { MetaFunction } from "react-router";

import { ActionFunctionArgs, Link, LoaderFunctionArgs, redirect, useNavigation } from "react-router";
import { useLoaderData, useActionData } from "react-router";
import {
	Form,
	Errors as FormErrors,
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
import { FaExclamationTriangle } from "react-icons/fa";
import { createCSRFToken } from "~/utils/csrf";
import { urlLang } from "~/utils/url";
import { getLanguage } from "~/utils/lang.backend";

import { ViewContext } from "~/frontend/context";

import { BackendContext } from "~/backend.server/context";
import { htmlTitle } from "~/utils/htmlmeta";
import { Card } from "primereact/card";
import { Message } from "primereact/message";
import { Password } from "primereact/password";
import { Button } from "primereact/button";
import { Divider } from "primereact/divider";
import { InputText } from "primereact/inputtext";

interface LoginFields {
	email: string;
	password: string;
	general: string;
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
	const { request } = actionArgs;

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
			{ status: 400 },
		);
	}

	const formData = formStringData(await request.formData());
	const email = formData.email || "";
	const password = formData.password || "";

	const cookieHeader = request.headers.get("Cookie") || "";
	const sessionCurrent = await sessionCookie().getSession(cookieHeader);

	if (formData.csrfToken !== sessionCurrent.get("csrfToken")) {
		return Response.json(
			{
				errors: {
					general: [
						"CSRF validation failed. Please ensure you're submitting the form from a valid session. For your security, please restart your browser and try again.",
					],
				},
			},
			{ status: 400 },
		);
	}

	const res = await superAdminLogin(email, password);
	if (!res.ok) {
		let errors: FormErrors<LoginFields> = {
			general: [
				ctx.t({
					code: "admin.email_password_dont_match",
					msg: "Email or password do not match",
				}),
			],
		};
		return Response.json({ errors }, { status: 400 });
	}

	const headers = await createSuperAdminSession(res.superAdminId);

	const url = new URL(request.url);
	let redirectTo = url.searchParams.get("redirectTo");

	redirectTo = getSafeRedirectTo(
		ctx.lang,
		redirectTo,
		"/admin/country-accounts",
	);
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
				code: "admin.db_connection_string_missing",
				msg: "Database connection string is missing",
			}),
		});
	} else if (!process.env.DATABASE_URL.startsWith("postgresql://")) {
		errors.push({
			variable: "DATABASE_URL",
			message: "Database connection string is invalid (must be PostgreSQL)",
		});
	}

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

	let publicUrlRes = configIsPublicUrlValid();
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
	const superAdminSession = await getSuperAdminSession(request);

	const url = new URL(request.url);
	let redirectTo = url.searchParams.get("redirectTo");
	const lang = getLanguage(loaderArgs);
	redirectTo = getSafeRedirectTo(lang, redirectTo, "/admin/country-accounts");

	if (superAdminSession) {
		return redirect(redirectTo);
	}

	// Validate required environment variables
	const configErrors = validateRequiredEnvVars(ctx);

	// Add a message about the number of configuration errors
	if (configErrors.length > 0) {
		console.warn(
			`Found ${configErrors.length} configuration errors that need to be fixed before proceeding with setup.`,
		);
	}

	const csrfToken = createCSRFToken();

	// Set a session cookie to mark this as an admin login origin
	const session = await sessionCookie().getSession();
	session.set("loginOrigin", "admin");
	session.set("csrfToken", csrfToken);
	const setCookie = await sessionCookie().commitSession(session);

	const isFormAuthSupported = configAuthSupportedForm();
	const isSSOAuthSupported = configAuthSupportedAzureSSOB2C();

	// If no authentication methods are configured, show error
	if (!isFormAuthSupported && !isSSOAuthSupported) {
		throw new Error(
			"No authentication methods configured. Please check AUTHENTICATION_SUPPORTED environment variable.",
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
		{ headers: { "Set-Cookie": setCookie } },
	);
};

export function getSafeRedirectTo(
	lang: string,
	redirectTo: string | null,
	defaultPath: string,
): string {
	if (
		redirectTo &&
		redirectTo.startsWith("/") &&
		!redirectTo.startsWith("//")
	) {
		return redirectTo;
	}
	return urlLang(lang, defaultPath);
}

export const meta: MetaFunction = () => {
	const ctx = new ViewContext();

	return [
		{
			title: htmlTitle(
				ctx,
				ctx.t({
					code: "meta.sign_in_super_admin",
					msg: "Sign-in - Super Admin",
				}),
			),
		},
		{
			name: "description",
			content: ctx.t({
				code: "meta.login",
				msg: "Login",
			}),
		},
	];
};

export default function Screen() {
	const loaderData = useLoaderData<LoginLoaderData>();
	const ctx = new ViewContext();
	const actionData = useActionData<LoginActionData>();
	const navigation = useNavigation();
	const isSubmitting =
		navigation.state === "submitting";

	const errors = actionData?.errors || {};

	const { isFormAuthSupported, isSSOAuthSupported, configErrors } = loaderData;

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
											code: "admin.system_config_errors",
											msg: "System configuration errors",
										})}
									</div>
									<p style={{ marginBottom: "10px" }}>
										{ctx.t(
											{
												code: "admin.required_config_missing_in_env_file",
												msg: "The following required configuration variables are missing or have invalid values in your {file} file.",
											},
											{ file: ".env" },
										)}
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
											code: "admin.update_env_file",
											msg: "Please update your .env file with the correct values before proceeding.",
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

	return (
		<div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
			<div className="w-full md:w-1/2 lg:w-1/3">
				<div className="flex flex-col gap-4">
					<div className="flex items-center justify-center gap-3 mb-4">
						{/* <div
							className="w-12 h-12 rounded-lg flex items-center justify-center"
							style={{ backgroundColor: "#004F91" }}
						>
							<i className="pi pi-globe text-white" style={{ fontSize: "1.5rem" }}></i>
						</div> */}
						<div className="flex flex-col">
							<span className="font-bold text-2xl leading-none tracking-tight text-[#004F91]">
								DELTA
							</span>
							<span className="text-xs uppercase font-bold text-gray-500 tracking-[0.1em] mt-0.5">
								Resilience
							</span>
						</div>
					</div>
					{isFormAuthSupported && (
						<Card className="w-full drop-shadow-xl rounded-2xl">
							<div className="text-center mb-4">
								<i
									className="pi pi-lock block mb-4 text-gray-700"
									style={{ fontSize: "2rem" }}
								></i>

								<h2 className="text-2xl font-semibold mb-2">
									{ctx.t({
										code: "admin.signin_admin_management",
										msg: "Sign in - Admin Management",
									})}
								</h2>
							</div>

							<div className="flex flex-col gap-1 items-start text-left w-full mb-2">
								{errors?.general && (
									<Message
										className="mb-2"
										severity="error"
										text={errors.general[0]}
									/>
								)}
							</div>

							<Form ctx={ctx} id="login-form" errors={errors}>
								<div className="flex flex-col gap-4">
									<input type="hidden" name="redirectTo" value={loaderData.redirectTo} />
									<input type="hidden" name="csrfToken" value={loaderData.csrfToken} />

									{/* Email */}
									<div className="flex flex-col gap-2">
										<label htmlFor="email" className="font-semibold">
											{ctx.t({ code: "user_login.email_address", msg: "Email address" })}
										</label>

										<div className="p-inputgroup login-inputgroup">
											<span className="p-inputgroup-addon">
												<i className="pi pi-envelope"></i>
											</span>
											<InputText
												id="email"
												type="email"
												name="email"
												className="w-full"
												placeholder={ctx.t({
													code: "user_login.enter_your_email",
													msg: "Enter your email",
												})}
												required
											/>
										</div>

										{errors?.fields?.email && (
											<div className="text-sm text-red-500">
												{errorToString(errors.fields.email[0])}
											</div>
										)}
									</div>

									{/* Password */}
									<div className="flex flex-col gap-2">
										<label htmlFor="password" className="font-semibold">
											{ctx.t({ code: "user_login.password", msg: "Password" })}
										</label>

										<div className="p-inputgroup login-inputgroup">
											<span className="p-inputgroup-addon">
												<i className="pi pi-lock"></i>
											</span>
											<Password
												id="password"
												name="password"
												className="w-full"
												style={{ width: "100%", flex: 1 }}
												inputClassName="w-full"
												inputStyle={{ width: "100%" }}
												toggleMask
												autoComplete="true"
												pt={{
													root: { className: "w-full", style: { width: "100%", flex: 1 } },
													iconField: { root: { className: "w-full" } },
													input: { className: "w-full" },
													hideIcon: { className: "ltr:!right-3 rtl:left-3 rtl:right-auto" },
													showIcon: { className: "ltr:!right-3 rtl:left-3 rtl:right-auto" },
												}}
												feedback={false}
												placeholder={ctx.t({
													code: "user_login.enter_your_password",
													msg: "Enter your password",
												})}
												required
											/>
										</div>

										{errors?.fields?.password && (
											<div className="text-sm text-red-500">
												{errorToString(errors.fields.password[0])}
											</div>
										)}
									</div>

									<Button
										type="submit"
										label={ctx.t({ code: "user_login.sign_in", msg: "Sign in" })}
										icon="pi pi-sign-in"
										loading={isSubmitting}
										disabled={isSubmitting}
										className="w-full mt-2"
									/>
								</div>
							</Form>

							{/* Divider */}
							{isSSOAuthSupported && (
								<Divider align="center">
									<span>
										{ctx.t({
											code: "common.or",
											msg: "Or",
										})}
									</span>
								</Divider>
							)}

							{isSSOAuthSupported && (
								<div className="flex flex-col gap-4 text-center mb-5">
									{ctx.t({
										code: "admin.use_sso_for_access",
										msg: "Use your organization's Single Sign-On to access your admin account.",
									})}

									<Link to={urlLang(ctx.lang, "/sso/azure-b2c/login?origin=admin&redirectTo=/admin/country-accounts&isAdmin=true&adminLogin=1")}>
										<Button
											label={ctx.t({
												code: "admin.signin_with_azure_b2c_sso",
												msg: "Sign in with Azure B2C SSO",
											})}
											severity="secondary"
											className="w-full"
											outlined
										/>
									</Link>
								</div>
							)}
						</Card>
					)}

					{!isFormAuthSupported && isSSOAuthSupported && (
						<div className="flex flex-col gap-4 text-center mb-5">
							{ctx.t({
								code: "admin.use_sso_for_access",
								msg: "Use your organization's Single Sign-On to access your admin account.",
							})}

							<Link to={urlLang(ctx.lang, "/sso/azure-b2c/login?origin=admin&redirectTo=/admin/country-accounts&isAdmin=true&adminLogin=1")}>
								<Button
									label={ctx.t({
										code: "admin.signin_with_azure_b2c_sso",
										msg: "Sign in with Azure B2C SSO",
									})}
									severity="secondary"
									className="w-full"
									outlined
								/>
							</Link>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
